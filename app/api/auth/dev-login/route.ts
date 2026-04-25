import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { createHash, randomBytes } from "node:crypto";

// Dev-login: accepts username/password, provisions a Convex session.
// In dev mode, password is not validated (≥3 chars only) — each username
// maps to its own investor (isolated balance/portfolio).
//
// Hardening applied:
// - Rate-limited per email+IP (5 failures / 10 min window — shared with prod login).
// - Token generated via crypto.randomBytes(32), stored only as SHA-256 hash.
// - Session expires after 24 h.
// - Same-origin check via Origin header (safe default for browser clients).

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function isOriginAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // server-to-server or same-origin fetch without Origin
  const host = req.headers.get("host");
  if (!host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isOriginAllowed(req)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (!username || !password || password.length < 3) {
    return NextResponse.json(
      { error: "Username and password (min 3 chars) required" },
      { status: 400 },
    );
  }

  // Normalise identity
  const email = username.includes("@") ? username : `${username}@mcse.local`;
  const emailLower = email.toLowerCase();
  const name = username.split("@")[0];
  const ip = clientIp(req);

  // ── Role detection by username pattern ──────────────────────────────────
  //   "admin"                      → admin
  //   "co-<TICKER>" e.g. co-enigma → company:ENIGMA
  //   anything else                → user (investor)
  let role: string = "user";
  const base = name.toLowerCase();
  if (base === "admin" || base.startsWith("admin-")) {
    role = "admin";
  } else if (base.startsWith("co-")) {
    const ticker = base.slice(3).toUpperCase();
    role = ticker ? `company:${ticker}` : "company";
  }

  const convex = convexServerClient();

  // Rate limit (reuses the prod rate-limit table)
  const rate = await convex.query(api.auth.rateLimitCheck, { emailLower, ip });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  try {
    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const expiresAt = Date.now() + 86_400_000; // 24h

    const provisioned = await convex.mutation(api.auth.provisionSession, {
      registrationId: `dev:${emailLower}`,
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
      // Also return the SHA-256 hash — client uses this for Convex queries
      // that need to identify the session. Doing it server-side avoids the
      // Web Crypto dependency (`crypto.subtle` is unavailable on non-HTTPS
      // LAN hosts, which would otherwise break on shared-testing setups).
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
    console.error("Dev-login failed:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
