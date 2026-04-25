import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

// Returns company-submitted + admin-injected news across all statuses
// (PENDING / APPROVED / REJECTED) so the admin UI can filter-by-status.
// Uses the unfiltered `listAllNews` query rather than `listNews` which
// hides PENDING items from investors.
export async function GET() {
  const convex = convexServerClient();
  const items = await convex.query(api.news.listAllNews, { limit: 200 });

  const filtered = items.filter(
    (n) => n.source === "COMPANY" || n.source === "ADMIN",
  );

  return NextResponse.json(
    filtered.map((n) => ({
      id: n.id,
      headline: n.headline,
      body: n.body,
      related_tickers: n.relatedTickers,
      sentiment: n.sentiment,
      source: n.source,
      status: n.status ?? "APPROVED",
      macro_tick: n.macroTick,
      published_at: new Date(n.publishedAt).toISOString(),
    })),
  );
}
