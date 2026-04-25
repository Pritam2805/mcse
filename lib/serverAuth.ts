import { createHash } from "node:crypto";
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
