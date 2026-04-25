import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const convex = convexServerClient();

  try {
    const item = await convex.query(api.news.getNewsItem, { id: id as Id<"news"> });
    if (!item) return NextResponse.json(null);

    return NextResponse.json({
      id: item.id,
      headline: item.headline,
      body: item.body,
      related_tickers: item.relatedTickers,
      sentiment: item.sentiment,
      source: item.source,
      macro_tick: item.macroTick,
      published_at: new Date(item.publishedAt).toISOString(),
    });
  } catch {
    return NextResponse.json(null);
  }
}
