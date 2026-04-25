import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Number(searchParams.get("limit") ?? "40");
  const ticker = searchParams.get("ticker") ?? undefined;

  const convex = convexServerClient();
  const items = await convex.query(api.news.listNews, {
    limit,
    ticker: ticker ?? undefined,
  });

  return NextResponse.json(
    items.map((n) => ({
      id: n.id,
      headline: n.headline,
      body: n.body,
      related_tickers: n.relatedTickers,
      sentiment: n.sentiment,
      source: n.source,
      macro_tick: n.macroTick,
      published_at: new Date(n.publishedAt).toISOString(),
    })),
    { headers: { "Cache-Control": "no-store, must-revalidate" } },
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
