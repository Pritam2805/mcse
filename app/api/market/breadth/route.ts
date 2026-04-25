import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET() {
  const convex = convexServerClient();
  const stocks = await convex.query(api.market.listStocks, {});

  let advances = 0;
  let declines = 0;
  let unchanged = 0;
  for (const s of stocks) {
    if (s.changePctDay > 0.01) advances++;
    else if (s.changePctDay < -0.01) declines++;
    else unchanged++;
  }

  return NextResponse.json({
    advances,
    declines,
    unchanged,
    advance_decline_ratio: declines > 0 ? advances / declines : advances,
  });
}
