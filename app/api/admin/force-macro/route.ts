import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function POST() {
  const convex = convexServerClient();
  await convex.mutation(api.diagnostics.triggerMacroTick, {});
  return NextResponse.json({ ok: true, note: "Scheduled LLM sentiment + news generation" });
}
