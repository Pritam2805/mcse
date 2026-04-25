import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { authenticate } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  const investor = await authenticate(req);
  if (!investor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const headline = typeof body.headline === "string" ? body.headline.trim() : "";
  const bodyText = typeof body.body === "string" ? body.body.trim() : "";
  const relatedTickers = Array.isArray(body.relatedTickers)
    ? body.relatedTickers.filter((t: unknown) => typeof t === "string")
    : [];
  const source = body.source === "ADMIN" ? "ADMIN" : "COMPANY";

  if (!headline || !bodyText) {
    return NextResponse.json(
      { error: "headline and body required" },
      { status: 400 },
    );
  }

  const convex = convexServerClient();
  const result = await convex.mutation(api.news.submitCompanyNews, {
    headline,
    body: bodyText,
    relatedTickers,
    source,
    tokenHash: investor.tokenHash,   // so the submittedBy field is set
  });

  return NextResponse.json({ id: result.id });
}
