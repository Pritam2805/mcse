import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function POST() {
  const convex = convexServerClient();
  const result = await convex.mutation(api.priceEngine.resetPrices, {});
  return NextResponse.json(result);
}
