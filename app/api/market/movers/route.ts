import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const kind = searchParams.get("kind") ?? "gainers"; // gainers | losers | most_traded | volume_shockers
  const limit = Number(searchParams.get("limit") ?? "10");

  const convex = convexServerClient();
  const stocks = await convex.query(api.market.listStocks, {});
  const sorted = [...stocks];

  if (kind === "gainers") sorted.sort((a, b) => b.changePctDay - a.changePctDay);
  else if (kind === "losers") sorted.sort((a, b) => a.changePctDay - b.changePctDay);
  else if (kind === "most_traded") sorted.sort((a, b) => b.volumeDay - a.volumeDay);
  else sorted.sort((a, b) => b.volumeDay - a.volumeDay);

  return NextResponse.json(
    sorted.slice(0, limit).map((s) => ({
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: s.currentPrice,
      change: s.changeDay,
      change_pct: s.changePctDay,
      volume: s.volumeDay,
    })),
  );
}
