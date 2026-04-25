import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

// Live market indices computed from current stock prices in Convex.
// Replaces the static mock indices that produced the price-flicker bug.
export async function GET() {
  const convex = convexServerClient();
  const indices = await convex.query(api.market.listIndices, {});
  return NextResponse.json(indices);
}
