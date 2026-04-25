import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

// Revokes the Convex session for the Bearer token on this request.
// Idempotent — returns 200 whether or not a session existed.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return NextResponse.json({ ok: true });

  const raw = match[1].trim();
  if (!raw) return NextResponse.json({ ok: true });

  const tokenHash = createHash("sha256").update(raw).digest("hex");
  try {
    const convex = convexServerClient();
    await convex.mutation(api.auth.revokeSession, { tokenHash });
  } catch (err) {
    console.error("Session revoke failed:", err);
    // Fall through — we still return ok so the client can clear local state.
  }
  return NextResponse.json({ ok: true });
}
