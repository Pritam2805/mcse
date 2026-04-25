import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { requireAdmin } from "@/lib/serverAuth";

// DELETE /api/admin/news/:id  — admin removes a news item
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

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
