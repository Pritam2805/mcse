import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// ── Auth helper ───────────────────────────────────────────────────────────────

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

// ── Place Order ───────────────────────────────────────────────────────────────

export const placeOrder = mutation({
  args: {
    tokenHash: v.string(),
    ticker: v.string(),
    side: v.union(v.literal("BUY"), v.literal("SELL")),
    orderType: v.union(v.literal("DELIVERY"), v.literal("INTRADAY")),
    pricingType: v.union(v.literal("MARKET"), v.literal("LIMIT")),
    quantity: v.number(),
    limitPrice: v.optional(v.number()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const investor = await investorFromSession(ctx, args.tokenHash);
    if (!investor) return { success: false, message: "Session expired. Please log in again." };

    // Hard gate: no orders accepted while the market is closed.
    // Admin opens/closes via the /admin market start/pause buttons.
    const marketState = await ctx.db.query("marketState").first();
    if (!marketState || !marketState.isOpen) {
      return {
        success: false,
        message: "Market is closed. Orders cannot be placed right now.",
      };
    }

    if (args.quantity <= 0 || !Number.isInteger(args.quantity)) {
      return { success: false, message: "Quantity must be a positive whole number." };
    }

    // Per-user rate limit: max 5 orders in any rolling 10-second window.
    // Prevents runaway scripts and accidental double-submits under load.
    const recentWindow = Date.now() - 10_000;
    const recentOrders = await ctx.db
      .query("orders")
      .withIndex("by_investor_time", (q) =>
        q.eq("investorId", investor._id).gte("timestamp", recentWindow),
      )
      .collect();
    if (recentOrders.length >= 5) {
      return { success: false, message: "Too many orders. Please wait a few seconds." };
    }

    const stock = await ctx.db
      .query("stocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .unique();
    if (!stock || !stock.isListed) {
      return { success: false, message: "Stock not found or not listed." };
    }

    const executionPrice =
      args.pricingType === "LIMIT" && args.limitPrice
        ? args.limitPrice
        : stock.currentPrice;

    const total = +(executionPrice * args.quantity).toFixed(2);
    const now = Date.now();

    if (args.side === "BUY") {
      if (total > investor.balance) {
        return {
          success: false,
          message: `Insufficient balance. Need ₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })} but have ₹${investor.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        };
      }

      // Deduct balance
      const newBalance = +(investor.balance - total).toFixed(2);
      await ctx.db.patch(investor._id, { balance: newBalance });

      // Insert order
      await ctx.db.insert("orders", {
        investorId: investor._id,
        stockId: stock._id,
        ticker: stock.ticker,
        stockName: stock.name,
        side: "BUY",
        orderType: args.orderType,
        pricingType: args.pricingType,
        quantity: args.quantity,
        price: executionPrice,
        limitPrice: args.limitPrice,
        total,
        status: "COMPLETED",
        timestamp: now,
      });

      // Update portfolio
      const existingPos = await ctx.db
        .query("portfolio")
        .withIndex("by_investor_ticker", (q) =>
          q.eq("investorId", investor._id).eq("ticker", stock.ticker),
        )
        .unique();

      if (existingPos) {
        const newQty = existingPos.quantity + args.quantity;
        const newTotalCost = +(existingPos.totalCost + total).toFixed(2);
        await ctx.db.patch(existingPos._id, {
          quantity: newQty,
          totalCost: newTotalCost,
          avgPrice: +(newTotalCost / newQty).toFixed(2),
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("portfolio", {
          investorId: investor._id,
          stockId: stock._id,
          ticker: stock.ticker,
          stockName: stock.name,
          quantity: args.quantity,
          avgPrice: executionPrice,
          totalCost: total,
          updatedAt: now,
        });
      }

      // Log transaction
      await ctx.db.insert("transactions", {
        investorId: investor._id,
        type: "BUY",
        ticker: stock.ticker,
        stockName: stock.name,
        quantity: args.quantity,
        price: executionPrice,
        amount: -total,
        balanceAfter: newBalance,
        description: `Bought ${args.quantity} ${stock.ticker} @ ₹${executionPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        timestamp: now,
      });

      // Update stock volume
      await ctx.db.patch(stock._id, {
        volumeDay: stock.volumeDay + args.quantity,
        marketCap: stock.currentPrice * stock.sharesOutstanding,
      });

      return { success: true, message: `Bought ${args.quantity} ${stock.ticker} @ ₹${executionPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` };
    }

    // ── SELL ──────────────────────────────────────────────────────────────────
    const existingPos = await ctx.db
      .query("portfolio")
      .withIndex("by_investor_ticker", (q) =>
        q.eq("investorId", investor._id).eq("ticker", stock.ticker),
      )
      .unique();

    if (!existingPos || existingPos.quantity < args.quantity) {
      return {
        success: false,
        message: `Insufficient holdings. You hold ${existingPos?.quantity ?? 0} ${stock.ticker}.`,
      };
    }

    // Credit balance
    const newBalance = +(investor.balance + total).toFixed(2);
    await ctx.db.patch(investor._id, { balance: newBalance });

    // Insert order
    await ctx.db.insert("orders", {
      investorId: investor._id,
      stockId: stock._id,
      ticker: stock.ticker,
      stockName: stock.name,
      side: "SELL",
      orderType: args.orderType,
      pricingType: args.pricingType,
      quantity: args.quantity,
      price: executionPrice,
      limitPrice: args.limitPrice,
      total,
      status: "COMPLETED",
      timestamp: now,
    });

    // Update portfolio
    const newQty = existingPos.quantity - args.quantity;
    if (newQty === 0) {
      await ctx.db.delete(existingPos._id);
    } else {
      // Keep avgPrice unchanged on sell (realised P&L is implicit)
      await ctx.db.patch(existingPos._id, {
        quantity: newQty,
        totalCost: +(existingPos.avgPrice * newQty).toFixed(2),
        updatedAt: now,
      });
    }

    // Log transaction
    await ctx.db.insert("transactions", {
      investorId: investor._id,
      type: "SELL",
      ticker: stock.ticker,
      stockName: stock.name,
      quantity: args.quantity,
      price: executionPrice,
      amount: total,
      balanceAfter: newBalance,
      description: `Sold ${args.quantity} ${stock.ticker} @ ₹${executionPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      timestamp: now,
    });

    // Update stock volume
    await ctx.db.patch(stock._id, {
      volumeDay: stock.volumeDay + args.quantity,
      marketCap: stock.currentPrice * stock.sharesOutstanding,
    });

    return { success: true, message: `Sold ${args.quantity} ${stock.ticker} @ ₹${executionPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` };
  },
});

// ── Portfolio ─────────────────────────────────────────────────────────────────

export const getPortfolio = query({
  args: { tokenHash: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      balance: v.number(),
      holdings: v.array(
        v.object({
          ticker: v.string(),
          stockName: v.string(),
          quantity: v.number(),
          avgPrice: v.number(),
          currentPrice: v.number(),
          totalCost: v.number(),
          currentValue: v.number(),
          unrealisedPL: v.number(),
          unrealisedPLPct: v.number(),
        }),
      ),
      totalInvested: v.number(),
      currentPortfolioValue: v.number(),
      totalPL: v.number(),
      totalPLPct: v.number(),
    }),
  ),
  handler: async (ctx, { tokenHash }) => {
    const investor = await investorFromSession(ctx, tokenHash);
    if (!investor) return null;

    const positions = await ctx.db
      .query("portfolio")
      .withIndex("by_investor", (q) => q.eq("investorId", investor._id))
      .collect();

    let totalInvested = 0;
    let currentPortfolioValue = 0;

    const holdings = await Promise.all(
      positions.map(async (pos) => {
        const stock = await ctx.db
          .query("stocks")
          .withIndex("by_ticker", (q) => q.eq("ticker", pos.ticker))
          .unique();
        const currentPrice = stock?.currentPrice ?? pos.avgPrice;
        const currentValue = +(currentPrice * pos.quantity).toFixed(2);
        const unrealisedPL = +(currentValue - pos.totalCost).toFixed(2);
        const unrealisedPLPct = pos.totalCost > 0
          ? +((unrealisedPL / pos.totalCost) * 100).toFixed(2)
          : 0;

        totalInvested += pos.totalCost;
        currentPortfolioValue += currentValue;

        return {
          ticker: pos.ticker,
          stockName: pos.stockName,
          quantity: pos.quantity,
          avgPrice: pos.avgPrice,
          currentPrice,
          totalCost: pos.totalCost,
          currentValue,
          unrealisedPL,
          unrealisedPLPct,
        };
      }),
    );

    const totalPL = +(currentPortfolioValue - totalInvested).toFixed(2);
    const totalPLPct = totalInvested > 0
      ? +((totalPL / totalInvested) * 100).toFixed(2)
      : 0;

    return {
      balance: investor.balance,
      holdings: holdings.sort((a, b) => b.currentValue - a.currentValue),
      totalInvested: +totalInvested.toFixed(2),
      currentPortfolioValue: +currentPortfolioValue.toFixed(2),
      totalPL,
      totalPLPct,
    };
  },
});

// ── Orders ────────────────────────────────────────────────────────────────────

export const getOrders = query({
  args: { tokenHash: v.string(), limit: v.optional(v.number()) },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        id: v.id("orders"),
        ticker: v.string(),
        stockName: v.string(),
        side: v.union(v.literal("BUY"), v.literal("SELL")),
        orderType: v.union(v.literal("DELIVERY"), v.literal("INTRADAY")),
        pricingType: v.union(v.literal("MARKET"), v.literal("LIMIT")),
        quantity: v.number(),
        price: v.number(),
        total: v.number(),
        status: v.union(v.literal("COMPLETED"), v.literal("PENDING"), v.literal("CANCELLED")),
        timestamp: v.number(),
      }),
    ),
  ),
  handler: async (ctx, { tokenHash, limit = 50 }) => {
    const investor = await investorFromSession(ctx, tokenHash);
    if (!investor) return null;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_investor_time", (q) => q.eq("investorId", investor._id))
      .order("desc")
      .take(limit);

    return orders.map((o) => ({
      id: o._id,
      ticker: o.ticker,
      stockName: o.stockName,
      side: o.side,
      orderType: o.orderType,
      pricingType: o.pricingType,
      quantity: o.quantity,
      price: o.price,
      total: o.total,
      status: o.status,
      timestamp: o.timestamp,
    }));
  },
});

// ── Transactions ──────────────────────────────────────────────────────────────

export const getTransactions = query({
  args: { tokenHash: v.string(), limit: v.optional(v.number()) },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        id: v.id("transactions"),
        type: v.union(v.literal("BUY"), v.literal("SELL"), v.literal("DEPOSIT")),
        ticker: v.union(v.string(), v.null()),
        stockName: v.union(v.string(), v.null()),
        quantity: v.union(v.number(), v.null()),
        price: v.union(v.number(), v.null()),
        amount: v.number(),
        balanceAfter: v.number(),
        description: v.string(),
        timestamp: v.number(),
      }),
    ),
  ),
  handler: async (ctx, { tokenHash, limit = 100 }) => {
    const investor = await investorFromSession(ctx, tokenHash);
    if (!investor) return null;

    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_investor_time", (q) => q.eq("investorId", investor._id))
      .order("desc")
      .take(limit);

    return txns.map((t) => ({
      id: t._id,
      type: t.type,
      ticker: t.ticker ?? null,
      stockName: t.stockName ?? null,
      quantity: t.quantity ?? null,
      price: t.price ?? null,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      timestamp: t.timestamp,
    }));
  },
});

// ── Holding for a single stock ─────────────────────────────────────────────────

export const getHolding = query({
  args: { tokenHash: v.string(), ticker: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      quantity: v.number(),
      avgPrice: v.number(),
      totalCost: v.number(),
    }),
  ),
  handler: async (ctx, { tokenHash, ticker }) => {
    const investor = await investorFromSession(ctx, tokenHash);
    if (!investor) return null;
    const pos = await ctx.db
      .query("portfolio")
      .withIndex("by_investor_ticker", (q) =>
        q.eq("investorId", investor._id).eq("ticker", ticker.toUpperCase()),
      )
      .unique();
    if (!pos) return null;
    return { quantity: pos.quantity, avgPrice: pos.avgPrice, totalCost: pos.totalCost };
  },
});
