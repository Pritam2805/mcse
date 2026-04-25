import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { authenticate } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const convex = convexServerClient();
  const orders = await convex.query(api.trading.getOrders, {
    tokenHash: investor.tokenHash,
    limit: 100,
  });
  if (!orders) return NextResponse.json([]);

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      ticker: o.ticker,
      name: o.stockName,
      type: o.side,
      order_type: o.orderType,
      pricing_type: o.pricingType,
      qty: o.quantity,
      price: o.price,
      total: o.total,
      status: o.status,
      timestamp: o.timestamp,
    })),
  );
}

export async function POST(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ticker = typeof body.ticker === "string" ? body.ticker : "";
  const side = body.side === "SELL" ? "SELL" : "BUY";
  const orderType = body.order_type === "INTRADAY" ? "INTRADAY" : "DELIVERY";
  const pricingType = body.pricing_type === "LIMIT" ? "LIMIT" : "MARKET";
  const quantity = Number(body.qty || body.quantity || 0);
  const limitPrice = body.limit_price != null ? Number(body.limit_price) : undefined;

  const convex = convexServerClient();
  const result = await convex.mutation(api.trading.placeOrder, {
    tokenHash: investor.tokenHash,
    ticker,
    side,
    orderType,
    pricingType,
    quantity,
    limitPrice,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
