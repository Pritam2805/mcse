import { NextResponse, type NextRequest } from "next/server";
import { authenticate } from "@/lib/serverAuth";

// bootstrapInvestor() calls POST /auth/login. This is an idempotent no-op:
// if a session exists, we echo it; the actual investor is provisioned at
// /api/auth/dev-login time. Starting balance is already set.
export async function POST(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, userId: investor.investorId });
}
