import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// DELETE /api/admin/news/:id  — admin removes a news item
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const convex = convexServerClient();
  try {
    const result = await convex.mutation(api.news.deleteNewsItem, {
      id: id as Id<"news">,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
