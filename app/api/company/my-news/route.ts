import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { authenticate } from "@/lib/serverAuth";

// Company dashboard "my submissions" view — returns all news items the
// current authenticated user has submitted, with status labels so the
// user can see whether admin has approved / rejected / not yet reviewed.
export async function GET(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const convex = convexServerClient();
  const items = await convex.query(api.news.listMyNews, {
    tokenHash: investor.tokenHash,
  });

  return NextResponse.json(
    items.map((n) => ({
      id: n.id,
      headline: n.headline,
      body: n.body,
      related_tickers: n.relatedTickers,
      source: n.source,
      status: n.status,
      published_at: new Date(n.publishedAt).toISOString(),
      reviewed_at: n.reviewedAt ? new Date(n.reviewedAt).toISOString() : null,
    })),
    { headers: { "Cache-Control": "no-store, must-revalidate" } },
  );
}

export const dynamic = "force-dynamic";
