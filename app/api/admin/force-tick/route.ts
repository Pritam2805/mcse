import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { requireAdmin } from "@/lib/serverAuth";

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const convex = convexServerClient();
  await convex.mutation(api.diagnostics.forceMicroTick, {});
  return NextResponse.json({ ok: true, note: "Scheduled a micro-tick" });
}
