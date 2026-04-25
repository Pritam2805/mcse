import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { authenticate } from "@/lib/serverAuth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const investor = await authenticate(req);
  if (!investor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { ticker } = await params;
  const convex = convexServerClient();
  const result = await convex.mutation(api.watchlist.remove, {
    tokenHash: investor.tokenHash,
    ticker,
  });
  return NextResponse.json(result);
}

// PUT (update alerts) — stub for now
export async function PUT() {
  return NextResponse.json({ ok: true });
}
