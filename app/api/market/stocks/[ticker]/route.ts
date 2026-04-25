import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const convex = convexServerClient();
  const stock = await convex.query(api.market.getStock, { ticker });
  if (!stock) return NextResponse.json(null);

  return NextResponse.json({
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    parent: {
      ticker: stock.holdingTicker,
      name: stock.holdingTicker,
    },
    price: stock.currentPrice,
    ohlcv: {
      open: stock.openPrice,
      high: stock.dayHigh,
      low: stock.dayLow,
      close: stock.currentPrice,
      volume: stock.volumeDay,
      macro_tick: 0,
    },
    // extra fields
    change: stock.changeDay,
    change_pct: stock.changePctDay,
    market_cap: stock.marketCap,
    shares_outstanding: stock.sharesOutstanding,
    float_shares: stock.floatShares,
    revenue: stock.revenue,
    expenses: stock.expenses,
    profit: stock.profit,
    assets: stock.assets,
    liabilities: stock.liabilities,
    cash: stock.cash,
    debt: stock.debt,
    product_quality: stock.productQuality,
    customer_satisfaction: stock.customerSatisfaction,
    innovation_pipeline: stock.innovationPipeline,
    brand_strength: stock.brandStrength,
    employee_count: stock.employeeCount,
    tier: stock.tier,
  });
}
