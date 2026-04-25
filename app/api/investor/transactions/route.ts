import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { authenticate } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const convex = convexServerClient();
  const txns = await convex.query(api.trading.getTransactions, {
    tokenHash: investor.tokenHash,
    limit: 200,
  });
  if (!txns) return NextResponse.json([]);

  return NextResponse.json(
    txns.map((t) => ({
      id: t.id,
      type: t.type,
      ticker: t.ticker,
      name: t.stockName,
      qty: t.quantity,
      price: t.price,
      amount: t.amount,
      balance: t.balanceAfter,
      timestamp: t.timestamp,
      description: t.description,
    })),
  );
}
