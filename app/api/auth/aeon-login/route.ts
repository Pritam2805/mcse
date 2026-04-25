import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { createHash, randomBytes } from "node:crypto";

/**
 * Aeon-login: validates {email, password} against the mu-aeon event-auth API,
 * then provisions a Convex session and returns the same {token, tokenHash, user}
 * shape as /auth/dev-login so the existing AuthContext + clientAuth flow works
 * unchanged.
 *
 * The mu-aeon API key is read from process.env on the server only — it MUST
 * NOT be exposed to the client (no NEXT_PUBLIC_ prefix).
 *
 * Hardening:
 * - Rate-limited per email+IP via the existing prod table (5 fails / 10 min).
 * - Token = crypto.randomBytes(32); only its SHA-256 hash is stored server-side.
 * - Session expires after 24h.
 * - Same-origin check via Origin header.
 * - Aeon failures count toward the rate limit (so brute-force against the
 *   upstream API is still bounded by us).
 */

const AEON_URL =
  process.env.AEON_AUTH_URL ||
  "https://www.mu-aeon.com/api/event-auth/validate";
// Accept either name for backward-compat with existing .env.local files.
const AEON_KEY =
  process.env.AEON_API_KEY || process.env.AEON_EVENT_API_KEY || "";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function isOriginAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  if (!host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

// Hardcoded admin allowlist + env-var override. Anyone whose email (lowercased)
// is in either list gets admin role after mu-aeon validates them.
//
// To add another admin: append to HARDCODED_ADMIN_EMAILS below, commit, push.
// (Or set the ADMIN_EMAILS env var on Vercel — both are unioned.)
const HARDCODED_ADMIN_EMAILS = [
  "se24ucam047@mahindrauniversity.edu.in",
];

const ADMIN_EMAILS = [
  ...HARDCODED_ADMIN_EMAILS,
  ...(process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
].map((s) => s.toLowerCase());

const COMPANY_EMAIL_MAP: Record<string, string> = (() => {
  const raw = process.env.COMPANY_EMAILS || "";
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [email, ticker] = pair.split(":").map((s) => s?.trim() || "");
    if (email && ticker) out[email.toLowerCase()] = ticker.toUpperCase();
  }
  return out;
})();

// Resolve the role for a (validated) login.
//   1. Email in ADMIN_EMAILS                  → "admin"
//   2. Email in COMPANY_EMAIL_MAP             → "company:<TICKER>"
//   3. Local-part is "admin" or "admin-*"     → "admin"   (legacy convention)
//   4. Local-part starts with "co-"           → "company:<TICKER>" (legacy)
//   5. otherwise                              → "user"
function deriveRoleFromEmail(email: string): string {
  const lower = email.toLowerCase();
  if (ADMIN_EMAILS.includes(lower)) return "admin";
  if (COMPANY_EMAIL_MAP[lower]) return `company:${COMPANY_EMAIL_MAP[lower]}`;

  const local = lower.split("@")[0] ?? "";
  if (local === "admin" || local.startsWith("admin-")) return "admin";
  if (local.startsWith("co-")) {
    const ticker = local.slice(3).toUpperCase();
    return ticker ? `company:${ticker}` : "company";
  }
  return "user";
}

async function validateWithAeon(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  if (!AEON_KEY) {
    return { ok: false, status: 500, reason: "AEON_API_KEY not configured" };
  }

  let res: Response;
  try {
    res = await fetch(AEON_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AEON_KEY,
      },
      body: JSON.stringify({ email, password }),
      // Don't let an upstream stall hang the user forever.
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      reason: err instanceof Error ? err.message : "upstream network error",
    };
  }

  if (!res.ok) {
    return { ok: false, status: 502, reason: `aeon ${res.status}` };
  }

  const body = (await res.json().catch(() => null)) as {
    valid?: boolean;
  } | null;

  if (!body || body.valid !== true) {
    return { ok: false, status: 401, reason: "invalid credentials" };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  if (!isOriginAllowed(req)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !email.includes("@") || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 },
    );
  }

  const emailLower = email.toLowerCase();
  const ip = clientIp(req);
  const convex = convexServerClient();

  // Rate limit before any upstream call — protects both us and mu-aeon.
  const rate = await convex.query(api.auth.rateLimitCheck, { emailLower, ip });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  // ── Domain-routed dispatch ──────────────────────────────────────────────
  // @mcse.in        → internal Convex accounts (admin + 19 company CEOs)
  // anything else   → mu-aeon (the 193 student accounts)
  // No fallback between them — clean separation, zero overhead for students.
  const domain = emailLower.split("@")[1] ?? "";
  const isInternal = domain === "mcse.in";

  let role: string;

  if (isInternal) {
    // Hash provided password and look up in internalAccounts.
    const pepper = process.env.AUTH_PEPPER || "";
    if (!pepper) {
      console.error("AUTH_PEPPER not set on Vercel");
      return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
    const providedHash = createHash("sha256")
      .update(password + pepper)
      .digest("hex");
    const account = await convex.query(
      api.internalAccounts.validateLoginByHash,
      { emailLower, providedHash },
    );
    if (!account) {
      await convex.mutation(api.auth.recordLoginAttempt, {
        emailLower,
        ip,
        succeeded: false,
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }
    role =
      account.role === "company" && account.ticker
        ? `company:${account.ticker}`
        : account.role;
  } else {
    // mu-aeon path (unchanged from before)
    const validation = await validateWithAeon(email, password);
    if (!validation.ok) {
      await convex.mutation(api.auth.recordLoginAttempt, {
        emailLower,
        ip,
        succeeded: false,
      });
      if (validation.status === 401) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }
      console.error("Aeon validation failed:", validation.reason);
      return NextResponse.json(
        { error: "Auth provider unreachable. Please try again." },
        { status: 502 },
      );
    }
    // mu-aeon validated — resolve role via Convex roleAssignments → env → prefix
    try {
      const assigned = await convex.query(api.auth.getRoleForEmail, {
        emailLower,
      });
      if (assigned?.role === "admin") {
        role = "admin";
      } else if (assigned?.role === "company" && assigned.ticker) {
        role = `company:${assigned.ticker}`;
      } else {
        role = deriveRoleFromEmail(email);
      }
    } catch (err) {
      console.error("roleAssignments lookup failed; falling back:", err);
      role = deriveRoleFromEmail(email);
    }
  }

  const name = email.split("@")[0];

  try {
    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const expiresAt = Date.now() + 86_400_000; // 24h

    const provisioned = await convex.mutation(api.auth.provisionSession, {
      registrationId: `aeon:${emailLower}`,
      email,
      participantName: name,
      teamName: undefined,
      tokenHash,
      expiresAt,
    });

    await convex.mutation(api.auth.recordLoginAttempt, {
      emailLower,
      ip,
      succeeded: true,
    });

    return NextResponse.json({
      token: raw,
      tokenHash,
      user: {
        userId: provisioned.investorId,
        username: name,
        name: provisioned.name,
        email: provisioned.email,
        role,
      },
    });
  } catch (err) {
    await convex.mutation(api.auth.recordLoginAttempt, {
      emailLower,
      ip,
      succeeded: false,
    });
    console.error("Aeon-login session provision failed:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
