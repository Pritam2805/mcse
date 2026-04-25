import { v } from "convex/values";
import { query } from "./_generated/server";

// ── Market State ─────────────────────────────────────────────────────────────

export const getMarketState = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      isOpen: v.boolean(),
      currentMicroTick: v.number(),
      currentMacroTick: v.number(),
      dayNumber: v.number(),
      openedAt: v.union(v.number(), v.null()),
      lastMicroTickAt: v.number(),
      lastMacroTickAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const state = await ctx.db.query("marketState").first();
    if (!state) return null;
    return {
      isOpen: state.isOpen,
      currentMicroTick: state.currentMicroTick,
      currentMacroTick: state.currentMacroTick,
      dayNumber: state.dayNumber,
      openedAt: state.openedAt ?? null,
      lastMicroTickAt: state.lastMicroTickAt,
      lastMacroTickAt: state.lastMacroTickAt,
    };
  },
});

// ── Holdings ─────────────────────────────────────────────────────────────────

const holdingResult = v.object({
  id: v.id("holdingCompanies"),
  slug: v.string(),
  name: v.string(),
  ticker: v.string(),
  sector: v.string(),
  about: v.string(),
  logoLetter: v.string(),
});

export const listHoldings = query({
  args: {},
  returns: v.array(holdingResult),
  handler: async (ctx) => {
    const holdings = await ctx.db.query("holdingCompanies").collect();
    return holdings
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((h) => ({
        id: h._id,
        slug: h.slug,
        name: h.name,
        ticker: h.ticker,
        sector: h.sector,
        about: h.about,
        logoLetter: h.logoLetter,
      }));
  },
});

export const getHolding = query({
  args: { ticker: v.string() },
  returns: v.union(v.null(), holdingResult),
  handler: async (ctx, { ticker }) => {
    const h = await ctx.db
      .query("holdingCompanies")
      .withIndex("by_ticker", (q) => q.eq("ticker", ticker.toUpperCase()))
      .unique();
    if (!h) return null;
    return { id: h._id, slug: h.slug, name: h.name, ticker: h.ticker, sector: h.sector, about: h.about, logoLetter: h.logoLetter };
  },
});

// ── Stocks ───────────────────────────────────────────────────────────────────

const stockResult = v.object({
  id: v.id("stocks"),
  holdingId: v.id("holdingCompanies"),
  holdingTicker: v.string(),
  ticker: v.string(),
  name: v.string(),
  sector: v.string(),
  tier: v.union(v.literal("FLAGSHIP"), v.literal("SECONDARY"), v.literal("EMERGING")),
  currentPrice: v.number(),
  openPrice: v.number(),
  dayHigh: v.number(),
  dayLow: v.number(),
  changeDay: v.number(),
  changePctDay: v.number(),
  volumeDay: v.number(),
  sharesOutstanding: v.number(),
  floatShares: v.number(),
  marketCap: v.number(),
  // Financials
  revenue: v.number(),
  expenses: v.number(),
  profit: v.number(),
  rdInvestment: v.number(),
  cash: v.number(),
  debt: v.number(),
  assets: v.number(),
  liabilities: v.number(),
  // Operational
  productQuality: v.number(),
  customerSatisfaction: v.number(),
  innovationPipeline: v.number(),
  brandStrength: v.number(),
  employeeCount: v.number(),
  netSentimentFactor: v.number(),
  isListed: v.boolean(),
});

export const listStocks = query({
  args: {},
  returns: v.array(stockResult),
  handler: async (ctx) => {
    const stocks = await ctx.db.query("stocks").collect();
    const holdingIds = [...new Set(stocks.map((s) => s.holdingId))];
    const holdingMap = new Map<string, string>();
    for (const hid of holdingIds) {
      const h = await ctx.db.get(hid);
      if (h) holdingMap.set(hid, h.ticker);
    }
    return stocks
      .filter((s) => s.isListed)
      .sort((a, b) => a.ticker.localeCompare(b.ticker))
      .map((s) => ({
        id: s._id,
        holdingId: s.holdingId,
        holdingTicker: holdingMap.get(s.holdingId) ?? "",
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        tier: s.tier,
        currentPrice: s.currentPrice,
        openPrice: s.openPrice,
        dayHigh: s.dayHigh,
        dayLow: s.dayLow,
        changeDay: s.changeDay,
        changePctDay: s.changePctDay,
        volumeDay: s.volumeDay,
        sharesOutstanding: s.sharesOutstanding,
        floatShares: s.floatShares,
        marketCap: s.marketCap,
        revenue: s.revenue,
        expenses: s.expenses,
        profit: s.profit,
        rdInvestment: s.rdInvestment,
        cash: s.cash,
        debt: s.debt,
        assets: s.assets,
        liabilities: s.liabilities,
        productQuality: s.productQuality,
        customerSatisfaction: s.customerSatisfaction,
        innovationPipeline: s.innovationPipeline,
        brandStrength: s.brandStrength,
        employeeCount: s.employeeCount,
        netSentimentFactor: s.netSentimentFactor,
        isListed: s.isListed,
      }));
  },
});

/**
 * Live market indices — aggregates real stock prices into sector/total
 * indices. Replaces the static mock indices that were causing display
 * flicker on /markets and the IndexBar.
 *
 * Returns a small array; one row per index. Each value is the market-cap-
 * weighted average of constituent stocks' (currentPrice / openPrice * 1000).
 * The 1000 base means an index of "1000.00" = unchanged from open.
 */
export const listIndices = query({
  args: {},
  returns: v.array(
    v.object({
      slug: v.string(),
      name: v.string(),
      value: v.number(),
      changePercent: v.number(),
      constituentCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const stocks = (await ctx.db.query("stocks").collect()).filter(
      (s) => s.isListed,
    );

    function aggregate(slug: string, name: string, members: typeof stocks) {
      if (members.length === 0) {
        return { slug, name, value: 1000, changePercent: 0, constituentCount: 0 };
      }
      let totalCap = 0;
      let totalWeightedRatio = 0;
      for (const s of members) {
        const cap = s.marketCap || s.currentPrice * s.sharesOutstanding || 1;
        const ratio = s.openPrice > 0 ? s.currentPrice / s.openPrice : 1;
        totalCap += cap;
        totalWeightedRatio += ratio * cap;
      }
      const avgRatio = totalCap > 0 ? totalWeightedRatio / totalCap : 1;
      return {
        slug,
        name,
        value: +(avgRatio * 1000).toFixed(2),
        changePercent: +((avgRatio - 1) * 100).toFixed(2),
        constituentCount: members.length,
      };
    }

    const bySector: Record<string, typeof stocks> = {};
    for (const s of stocks) {
      (bySector[s.sector] ||= []).push(s);
    }

    return [
      aggregate("mcse", "MCSE 50", stocks),
      ...Object.entries(bySector).map(([sector, members]) =>
        aggregate(
          sector.toLowerCase().replace(/\s+/g, "-"),
          sector.toUpperCase(),
          members,
        ),
      ),
    ];
  },
});

export const listStocksByHolding = query({
  args: { holdingTicker: v.string() },
  returns: v.array(stockResult),
  handler: async (ctx, { holdingTicker }) => {
    const holding = await ctx.db
      .query("holdingCompanies")
      .withIndex("by_ticker", (q) => q.eq("ticker", holdingTicker.toUpperCase()))
      .unique();
    if (!holding) return [];
    const stocks = await ctx.db
      .query("stocks")
      .withIndex("by_holding", (q) => q.eq("holdingId", holding._id))
      .collect();
    return stocks.map((s) => ({
      id: s._id,
      holdingId: s.holdingId,
      holdingTicker: holding.ticker,
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      tier: s.tier,
      currentPrice: s.currentPrice,
      openPrice: s.openPrice,
      dayHigh: s.dayHigh,
      dayLow: s.dayLow,
      changeDay: s.changeDay,
      changePctDay: s.changePctDay,
      volumeDay: s.volumeDay,
      sharesOutstanding: s.sharesOutstanding,
      floatShares: s.floatShares,
      marketCap: s.marketCap,
      revenue: s.revenue,
      expenses: s.expenses,
      profit: s.profit,
      rdInvestment: s.rdInvestment,
      cash: s.cash,
      debt: s.debt,
      assets: s.assets,
      liabilities: s.liabilities,
      productQuality: s.productQuality,
      customerSatisfaction: s.customerSatisfaction,
      innovationPipeline: s.innovationPipeline,
      brandStrength: s.brandStrength,
      employeeCount: s.employeeCount,
      netSentimentFactor: s.netSentimentFactor,
      isListed: s.isListed,
    }));
  },
});

export const getStock = query({
  args: { ticker: v.string() },
  returns: v.union(v.null(), stockResult),
  handler: async (ctx, { ticker }) => {
    const s = await ctx.db
      .query("stocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", ticker.toUpperCase()))
      .unique();
    if (!s) return null;
    const holding = await ctx.db.get(s.holdingId);
    return {
      id: s._id,
      holdingId: s.holdingId,
      holdingTicker: holding?.ticker ?? "",
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      tier: s.tier,
      currentPrice: s.currentPrice,
      openPrice: s.openPrice,
      dayHigh: s.dayHigh,
      dayLow: s.dayLow,
      changeDay: s.changeDay,
      changePctDay: s.changePctDay,
      volumeDay: s.volumeDay,
      sharesOutstanding: s.sharesOutstanding,
      floatShares: s.floatShares,
      marketCap: s.marketCap,
      revenue: s.revenue,
      expenses: s.expenses,
      profit: s.profit,
      rdInvestment: s.rdInvestment,
      cash: s.cash,
      debt: s.debt,
      assets: s.assets,
      liabilities: s.liabilities,
      productQuality: s.productQuality,
      customerSatisfaction: s.customerSatisfaction,
      innovationPipeline: s.innovationPipeline,
      brandStrength: s.brandStrength,
      employeeCount: s.employeeCount,
      netSentimentFactor: s.netSentimentFactor,
      isListed: s.isListed,
    };
  },
});

// ── Price History ─────────────────────────────────────────────────────────────

export const getPriceHistory = query({
  args: { ticker: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({ price: v.number(), timestamp: v.number(), microTick: v.number() }),
  ),
  handler: async (ctx, { ticker, limit = 120 }) => {
    const rows = await ctx.db
      .query("priceHistory")
      .withIndex("by_ticker_time", (q) => q.eq("ticker", ticker.toUpperCase()))
      .order("desc")
      .take(limit);
    return rows.reverse().map((r) => ({
      price: r.price,
      timestamp: r.timestamp,
      microTick: r.microTick,
    }));
  },
});
