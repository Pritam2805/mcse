import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export interface AuthedInvestor {
  investorId: string;
  email: string;
  name: string;
  teamName: string | null;
  balance: number;
  tokenHash: string;
}

/**
 * Extract Bearer token from Authorization header, hash it,
 * look up the investor session in Convex.
 * Returns null if no token / invalid / expired.
 */
export async function authenticate(req: Request): Promise<AuthedInvestor | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const raw = match[1].trim();
  if (!raw) return null;

  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const convex = convexServerClient();
  const session = await convex.query(api.auth.getInvestorBySession, { tokenHash });
  if (!session) return null;

  return { ...session, tokenHash };
}

/**
 * Look up the role bound to the request's session token. Reads role from
 * the Convex sessions table — NOT from the client. localStorage tampering
 * has no effect.
 */
export async function getRequestRole(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw) return null;
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const convex = convexServerClient();
  return await convex.query(api.auth.getSessionRole, { tokenHash });
}

/**
 * Guard helper: returns a 403 NextResponse if the request is not from an
 * admin session, otherwise returns null (caller proceeds).
 *
 * Usage:
 *   const guard = await requireAdmin(req);
 *   if (guard) return guard;
 *   // ...admin work...
 */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const role = await getRequestRole(req);
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  return null;
}

/**
 * Guard for company-only endpoints. Returns the ticker (e.g. "ENIGMA") if
 * the session is a company, or a NextResponse error if not.
 */
export async function requireCompany(
  req: Request,
): Promise<{ ticker: string } | NextResponse> {
  const role = await getRequestRole(req);
  if (!role || !role.startsWith("company:")) {
    return NextResponse.json({ error: "Company only" }, { status: 403 });
  }
  return { ticker: role.slice("company:".length) };
}
