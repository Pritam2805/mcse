import { NextResponse, type NextRequest } from "next/server";
import { authenticate } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    userId: investor.investorId,
    email: investor.email,
    name: investor.name,
    teamName: investor.teamName,
    balance: investor.balance,
    role: "user",
  });
}
