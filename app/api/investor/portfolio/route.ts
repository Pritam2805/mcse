import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { authenticate } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const convex = convexServerClient();
  const pf = await convex.query(api.trading.getPortfolio, { tokenHash: investor.tokenHash });
  if (!pf) return NextResponse.json({ balance: 0, holdings: [] });

  return NextResponse.json({
    balance: pf.balance,
    holdings: pf.holdings.map((h) => ({
      ticker: h.ticker,
      name: h.stockName,
      sector: "",
      quantity: h.quantity,
      avg_price: h.avgPrice,
      current_price: h.currentPrice,
      pnl: h.unrealisedPL,
      change_day: h.changeDay,
      change_pct_day: h.changePctDay,
      updated_at: new Date().toISOString(),
    })),
  });
}
