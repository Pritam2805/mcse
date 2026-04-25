import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { authenticate } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const convex = convexServerClient();
  const items = await convex.query(api.watchlist.list, { tokenHash: investor.tokenHash });
  if (!items) return NextResponse.json([]);

  return NextResponse.json(
    items.map((w) => ({
      id: w.id,
      ticker: w.ticker,
      name: w.stockName,
      sector: w.sector,
      price_alert_above: w.priceAlertAbove,
      price_alert_below: w.priceAlertBelow,
      alert_above_armed: w.priceAlertAbove !== null,
      alert_below_armed: w.priceAlertBelow !== null,
      added_at: new Date(w.addedAt).toISOString(),
      current_price: w.currentPrice,
    })),
  );
}

export async function POST(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ticker = typeof body.ticker === "string" ? body.ticker : "";

  const convex = convexServerClient();
  const result = await convex.mutation(api.watchlist.add, {
    tokenHash: investor.tokenHash,
    ticker,
  });
  return NextResponse.json(result);
}
