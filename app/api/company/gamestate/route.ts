import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

// GET /api/company/gamestate?ticker=ENIGMA
// Returns aggregated subsidiary data for a holding company.
// No auth required — this is public data. A real company portal would
// gate per-company write endpoints; reads are shared with investors.
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker") ?? "";
  if (!ticker) {
    return NextResponse.json(
      { subsidiaries: [], error: "ticker query param required" },
      { status: 400 },
    );
  }

  const convex = convexServerClient();
  const subs = await convex.query(api.market.listStocksByHolding, {
    holdingTicker: ticker,
  });

  return NextResponse.json({
    subsidiaries: subs.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      revenue: s.revenue,
      expenses: s.expenses,
      profit: s.profit,
      rdInvestment: s.rdInvestment,
      marketingSpend: 0, // not exposed publicly
      productionCapacity: 0,
      employeeCount: s.employeeCount,
      productQuality: s.productQuality,
      customerSatisfaction: s.customerSatisfaction,
      innovationPipeline: s.innovationPipeline,
      brandStrength: s.brandStrength,
      cash: s.cash,
      debt: s.debt,
      assets: s.assets,
      liabilities: s.liabilities,
    })),
  });
}
