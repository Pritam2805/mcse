import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET() {
  const convex = convexServerClient();
  const stocks = await convex.query(api.market.listStocks, {});
  const holdings = await convex.query(api.market.listHoldings, {});
  const holdingMap = new Map(holdings.map((h) => [h.ticker, h.name]));

  return NextResponse.json(
    stocks.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      parent: {
        ticker: s.holdingTicker,
        name: holdingMap.get(s.holdingTicker) ?? s.holdingTicker,
      },
      price: s.currentPrice,
      // extra fields used by mcse pages
      change: s.changeDay,
      change_pct: s.changePctDay,
      day_high: s.dayHigh,
      day_low: s.dayLow,
      open_price: s.openPrice,
      volume: s.volumeDay,
      market_cap: s.marketCap,
      tier: s.tier,
    })),
  );
}
