import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET() {
  const convex = convexServerClient();
  const [holdings, stocks] = await Promise.all([
    convex.query(api.market.listHoldings, {}),
    convex.query(api.market.listStocks, {}),
  ]);

  return NextResponse.json(
    holdings.map((h) => {
      const subs = stocks.filter((s) => s.holdingTicker === h.ticker);
      return {
        ticker: h.ticker,
        name: h.name,
        sector: h.sector,
        about: h.about,
        logo_letter: h.logoLetter,
        subsidiaries: subs.map((s) => ({
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          price: s.currentPrice,
          change_pct: s.changePctDay,
          market_cap: s.marketCap,
        })),
        total_market_cap: subs.reduce((sum, s) => sum + s.marketCap, 0),
      };
    }),
  );
}
