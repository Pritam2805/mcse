import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { requireAdmin } from "@/lib/serverAuth";

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const convex = convexServerClient();
  const result = await convex.mutation(api.priceEngine.resetPrices, {});
  return NextResponse.json(result);
}
