import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signSession, SESSION_COOKIE } from "@/lib/auth-jwt";

export const runtime = "nodejs";

const MU_AEON_ENDPOINT =
  process.env.MU_AEON_AUTH_URL || "https://www.mu-aeon.com/api/event-auth/validate";
const MU_AEON_API_KEY =
  process.env.AEON_EVENT_API_KEY || process.env.MU_AEON_API_KEY || "";

export async function POST(request: Request) {
  if (!MU_AEON_API_KEY) {
    return NextResponse.json({ error: "Server auth not configured" }, { status: 500 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(MU_AEON_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": MU_AEON_API_KEY },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Auth service unreachable" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "Auth service error" }, { status: 502 });
  }

  let result: { valid?: unknown };
  try {
    result = await upstream.json();
  } catch {
    return NextResponse.json({ error: "Bad auth response" }, { status: 502 });
  }

  if (result.valid !== true) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const { token, maxAge } = await signSession(email);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return NextResponse.json({ ok: true, email });
}
