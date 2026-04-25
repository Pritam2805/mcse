import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { authenticate } from "@/lib/serverAuth";

const STARTING_BALANCE = 200_000;

export async function GET(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const convex = convexServerClient();
  const pf = await convex.query(api.trading.getPortfolio, { tokenHash: investor.tokenHash });
  if (!pf) {
    return NextResponse.json({
      event_return_pct: 0,
      total_return_pct: 0,
      sector_allocation: [],
      top_gainers: [],
      top_losers: [],
      risk_score: 0,
      benchmark_aeon50_pct: 0,
      alpha_pct: 0,
    });
  }

  const currentValue = pf.balance + pf.currentPortfolioValue;
  const returnPct = ((currentValue - STARTING_BALANCE) / STARTING_BALANCE) * 100;
  const topGainers = [...pf.holdings]
    .sort((a, b) => b.unrealisedPLPct - a.unrealisedPLPct)
    .slice(0, 3)
    .map((h) => ({ ticker: h.ticker, returnPct: h.unrealisedPLPct }));
  const topLosers = [...pf.holdings]
    .sort((a, b) => a.unrealisedPLPct - b.unrealisedPLPct)
    .slice(0, 3)
    .map((h) => ({ ticker: h.ticker, returnPct: h.unrealisedPLPct }));

  return NextResponse.json({
    event_return_pct: returnPct,
    total_return_pct: returnPct,
    sector_allocation: [],
    top_gainers: topGainers,
    top_losers: topLosers,
    risk_score: 50,
    benchmark_aeon50_pct: 0,
    alpha_pct: returnPct,
  });
}
