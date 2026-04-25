import { NextResponse } from "next/server";

// GET /api/company/credibility
// Stub: the credibility/deception system (§7 of the framework) isn't
// implemented yet. Return a neutral default so the UI renders cleanly.
export async function GET() {
  return NextResponse.json({
    currentScore: 100,
    history: [],
    recentEvents: [],
  });
}
