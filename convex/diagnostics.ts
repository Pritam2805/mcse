import { v } from "convex/values";
import { query, mutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Health check for the price engine + LLM pipeline + DB.
export const health = query({
  args: {},
  returns: v.object({
    db: v.object({
      holdings: v.number(),
      stocks: v.number(),
      news: v.number(),
      portfolioPositions: v.number(),
      investors: v.number(),
    }),
    market: v.union(
      v.null(),
      v.object({
        isOpen: v.boolean(),
        currentMicroTick: v.number(),
        currentMacroTick: v.number(),
        dayNumber: v.number(),
        lastMicroTickAt: v.number(),
        lastMacroTickAt: v.number(),
        secondsSinceLastMicroTick: v.number(),
        secondsSinceLastMacroTick: v.number(),
        microTickHealthy: v.boolean(),   // <30s since last tick
        macroTickHealthy: v.boolean(),   // <10min since last macro
      }),
    ),
    sampleStocks: v.array(
      v.object({
        ticker: v.string(),
        currentPrice: v.number(),
        openPrice: v.number(),
        macroOpenPrice: v.number(),
        changePctDay: v.number(),
        netSentimentFactor: v.number(),
      }),
    ),
    llm: v.object({
      anthropicKeyConfigured: v.boolean(),
      totalNewsItems: v.number(),
      newestNewsHeadline: v.union(v.string(), v.null()),
      newestNewsAge: v.union(v.number(), v.null()),
      stocksWithNonZeroSentiment: v.number(),
    }),
    priceActivity: v.object({
      stocksMovedFromOpen: v.number(),       // out of 57
      biggestMoverTicker: v.string(),
      biggestMoverPct: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const [holdings, stocks, news, portfolio, investors] = await Promise.all([
      ctx.db.query("holdingCompanies").collect(),
      ctx.db.query("stocks").collect(),
      ctx.db.query("news").collect(),
      ctx.db.query("portfolio").collect(),
      ctx.db.query("investors").collect(),
    ]);
    const market = await ctx.db.query("marketState").first();
    const now = Date.now();

    const newestNews = [...news].sort((a, b) => b.publishedAt - a.publishedAt)[0];
    const nonZeroSentimentCount = stocks.filter((s) => Math.abs(s.netSentimentFactor) > 0.0001).length;
    const movedCount = stocks.filter((s) => Math.abs(s.currentPrice - s.openPrice) > 0.01).length;
    const biggestMover = [...stocks].sort((a, b) => Math.abs(b.changePctDay) - Math.abs(a.changePctDay))[0];

    const secSinceMicro = market ? Math.round((now - market.lastMicroTickAt) / 1000) : 999;
    const secSinceMacro = market ? Math.round((now - market.lastMacroTickAt) / 1000) : 999;

    return {
      db: {
        holdings: holdings.length,
        stocks: stocks.length,
        news: news.length,
        portfolioPositions: portfolio.length,
        investors: investors.length,
      },
      market: market
        ? {
            isOpen: market.isOpen,
            currentMicroTick: market.currentMicroTick,
            currentMacroTick: market.currentMacroTick,
            dayNumber: market.dayNumber,
            lastMicroTickAt: market.lastMicroTickAt,
            lastMacroTickAt: market.lastMacroTickAt,
            secondsSinceLastMicroTick: secSinceMicro,
            secondsSinceLastMacroTick: secSinceMacro,
            microTickHealthy: secSinceMicro < 30,
            macroTickHealthy: secSinceMacro < 600,
          }
        : null,
      sampleStocks: stocks.slice(0, 5).map((s) => ({
        ticker: s.ticker,
        currentPrice: s.currentPrice,
        openPrice: s.openPrice,
        macroOpenPrice: s.macroOpenPrice,
        changePctDay: s.changePctDay,
        netSentimentFactor: s.netSentimentFactor,
      })),
      llm: {
        anthropicKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
        totalNewsItems: news.length,
        newestNewsHeadline: newestNews?.headline ?? null,
        newestNewsAge: newestNews ? Math.round((now - newestNews.publishedAt) / 1000) : null,
        stocksWithNonZeroSentiment: nonZeroSentimentCount,
      },
      priceActivity: {
        stocksMovedFromOpen: movedCount,
        biggestMoverTicker: biggestMover?.ticker ?? "",
        biggestMoverPct: biggestMover?.changePctDay ?? 0,
      },
    };
  },
});

// Force-trigger micro tick (for debugging)
export const forceMicroTick = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Re-import internal mutation body by scheduling it
    await ctx.scheduler.runAfter(0, internal.priceEngine.applyMicroTick, {});
    return null;
  },
});

// Force-trigger macro tick (LLM sentiment + news)
export const forceMacroTick = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runAction(internal.priceEngine.applyMacroTick, {});
    await ctx.runAction(internal.news.generateMacroNews, {});
    return null;
  },
});

// Wrapper to call the internal action from a mutation (for external trigger)
export const triggerMacroTick = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.diagnostics.forceMacroTick, {});
    return null;
  },
});
