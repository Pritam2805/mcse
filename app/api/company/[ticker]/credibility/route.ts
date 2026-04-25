import { NextResponse } from "next/server";

// GET /api/company/[ticker]/credibility — stub
export async function GET() {
  return NextResponse.json({
    currentScore: 100,
    history: [],
    recentEvents: [],
  });
}
