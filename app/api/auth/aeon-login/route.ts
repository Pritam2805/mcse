import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

// Validates credentials against the Aeon event-auth API and, on success,
// provisions a Convex session (same shape `/api/auth/dev-login` returns, so
// the client auth path is identical).
//
// Mirrors the hardening of dev-login:
//   • same-origin check
//   • rate-limited per email + IP
//   • token generated via crypto.randomBytes, stored only as SHA-256
//   • 24 h session expiry

const AEON_VALIDATE_URL = "https://www.mu-aeon.com/api/event-auth/validate";

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
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

interface AeonValidateResponse {
  valid?: boolean;
  // Aeon may send additional fields (name, role, team, …) — anything we
  // don't read is simply ignored.
  name?: string;
  role?: string;
  team?: string;
  teamName?: string;
  participantName?: string;
}

function deriveRole(raw: unknown): string {
  if (typeof raw !== "string") return "user";
  if (raw === "admin") return "admin";
  if (raw.startsWith("company")) return raw; // preserve "company:TICKER"
  return "user";
}

export async function POST(req: NextRequest) {
  if (!isOriginAllowed(req)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.AEON_EVENT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: AEON_EVENT_API_KEY is not set" },
      { status: 500 },
    );
  }

  const emailLower = email.toLowerCase();
  const ip = clientIp(req);
  const convex = convexServerClient();

  // Rate limit (shared with dev-login)
  const rate = await convex.query(api.auth.rateLimitCheck, { emailLower, ip });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  // ── Validate with Aeon ─────────────────────────────────────────────────
  let aeonRes: Response;
  try {
    aeonRes = await fetch(AEON_VALIDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Auth provider unreachable: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  let data: AeonValidateResponse = {};
  try {
    data = (await aeonRes.json()) as AeonValidateResponse;
  } catch {
    // Non-JSON response — treat as invalid.
  }

  if (!aeonRes.ok || !data.valid) {
    await convex.mutation(api.auth.recordLoginAttempt, {
      emailLower,
      ip,
      succeeded: false,
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // ── Provision Convex session ───────────────────────────────────────────
  const participantName =
    (typeof data.name === "string" && data.name.trim()) ||
    (typeof data.participantName === "string" && data.participantName.trim()) ||
    email.split("@")[0];
  const teamName =
    (typeof data.teamName === "string" && data.teamName.trim()) ||
    (typeof data.team === "string" && data.team.trim()) ||
    undefined;
  const role = deriveRole(data.role);

  try {
    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const expiresAt = Date.now() + 86_400_000; // 24 h

    const provisioned = await convex.mutation(api.auth.provisionSession, {
      registrationId: `aeon:${emailLower}`,
      email,
      participantName,
      teamName,
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
        username: participantName,
        name: provisioned.name,
        email: provisioned.email,
        role,
      },
    });
  } catch (err) {
    console.error("Aeon login: Convex provisioning failed:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
