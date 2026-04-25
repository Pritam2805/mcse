import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET() {
  const convex = convexServerClient();
  const result = await convex.query(api.diagnostics.health, {});
  return NextResponse.json(result);
}
