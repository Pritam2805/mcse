import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

async function investorFromSession(
  ctx: QueryCtx | MutationCtx,
  tokenHash: string,
): Promise<Doc<"investors"> | null> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  return ctx.db.get(session.investorId);
}

export const list = query({
  args: { tokenHash: v.string() },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        id: v.id("watchlist"),
        ticker: v.string(),
        stockName: v.string(),
        sector: v.string(),
        currentPrice: v.union(v.number(), v.null()),
        priceAlertAbove: v.union(v.number(), v.null()),
        priceAlertBelow: v.union(v.number(), v.null()),
        addedAt: v.number(),
      }),
    ),
  ),
  handler: async (ctx, { tokenHash }) => {
    const investor = await investorFromSession(ctx, tokenHash);
    if (!investor) return null;
    const rows = await ctx.db
      .query("watchlist")
      .withIndex("by_investor", (q) => q.eq("investorId", investor._id))
      .collect();

    const result = [];
    for (const r of rows) {
      const stock = await ctx.db
        .query("stocks")
        .withIndex("by_ticker", (q) => q.eq("ticker", r.ticker))
        .unique();
      result.push({
        id: r._id,
        ticker: r.ticker,
        stockName: r.stockName,
        sector: r.sector,
        currentPrice: stock?.currentPrice ?? null,
        priceAlertAbove: r.priceAlertAbove ?? null,
        priceAlertBelow: r.priceAlertBelow ?? null,
        addedAt: r.addedAt,
      });
    }
    return result;
  },
});

export const add = mutation({
  args: { tokenHash: v.string(), ticker: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { tokenHash, ticker }) => {
    const investor = await investorFromSession(ctx, tokenHash);
    if (!investor) return { ok: false };

    const existing = await ctx.db
      .query("watchlist")
      .withIndex("by_investor_ticker", (q) =>
        q.eq("investorId", investor._id).eq("ticker", ticker.toUpperCase()),
      )
      .unique();
    if (existing) return { ok: true };

    const stock = await ctx.db
      .query("stocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", ticker.toUpperCase()))
      .unique();
    if (!stock) return { ok: false };

    await ctx.db.insert("watchlist", {
      investorId: investor._id,
      ticker: stock.ticker,
      stockName: stock.name,
      sector: stock.sector,
      addedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { tokenHash: v.string(), ticker: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { tokenHash, ticker }) => {
    const investor = await investorFromSession(ctx, tokenHash);
    if (!investor) return { ok: false };

    const existing = await ctx.db
      .query("watchlist")
      .withIndex("by_investor_ticker", (q) =>
        q.eq("investorId", investor._id).eq("ticker", ticker.toUpperCase()),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});
