import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createHash } from "node:crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const reviewerTokenHash = match
    ? createHash("sha256").update(match[1].trim()).digest("hex")
    : undefined;

  try {
    const convex = convexServerClient();
    const result = await convex.mutation(api.news.rejectNews, {
      id: id as Id<"news">,
      reviewerTokenHash,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
