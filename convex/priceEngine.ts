import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ── Gaussian noise helper ─────────────────────────────────────────────────────
// Box-Muller transform for normally distributed noise
function gaussianNoise(mean: number, sigma: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + sigma * z;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// ── Micro-tick: update all stock prices ──────────────────────────────────────
// Price formula (from MCSE framework §4.4):
//   Δ% = (order_imbalance_factor × 0.40)
//       + (net_sentiment_factor × 0.35)
//       + (gaussian_noise × 0.25)
//   clamped to ±3% per micro-tick
//   cumulative clamped to ±10% from macro-open price
//
// order_imbalance_factor: derived from recent buy/sell volume ratio for this stock
// net_sentiment_factor: set by LLM macro-tick (stored on stock)

export const applyMicroTick = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const state = await ctx.db.query("marketState").first();
    if (!state || !state.isOpen) return null;

    const stocks = await ctx.db.query("stocks").collect();
    const now = Date.now();
    const newMicroTick = state.currentMicroTick + 1;

    // Look at recent orders (last 15 seconds) to compute order imbalance
    const windowStart = now - 15_000;

    for (const stock of stocks) {
      if (!stock.isListed) continue;

      // Order imbalance from recent trades
      const recentOrders = await ctx.db
        .query("orders")
        .withIndex("by_ticker_time", (q) =>
          q.eq("ticker", stock.ticker).gte("timestamp", windowStart),
        )
        .collect();

      let buyVolume = 0;
      let sellVolume = 0;
      for (const o of recentOrders) {
        if (o.side === "BUY") buyVolume += o.quantity;
        else sellVolume += o.quantity;
      }
      const totalVolume = buyVolume + sellVolume;
      // OIF: order imbalance ratio scaled to ±1% impact per tick max
      const oif = totalVolume > 0
        ? ((buyVolume - sellVolume) / totalVolume) * 0.01
        : 0;

      // Net sentiment factor from LLM — clamped to ±0.015 (= ±1.5% directional impulse)
      const nsf = clamp(stock.netSentimentFactor, -0.015, 0.015);

      // Gaussian noise: σ=0.008 → typical ±0.8% raw, → ±0.28% per tick after 0.35 weight
      // This is the PRIMARY driver of tick-to-tick movement (visible in UI).
      const noise = gaussianNoise(0, 0.008);

      // Soft mean-reversion ONLY near circuit-breaker boundaries (±10% from open)
      // Keeps price from sticking at ±15% cap, but doesn't kill intraday volatility.
      const distanceRatio = (stock.currentPrice - stock.openPrice) / stock.openPrice;
      const softPull = Math.abs(distanceRatio) > 0.10
        ? -distanceRatio * 0.03 // weak pullback when > ±10% from open
        : 0;

      // Raw delta
      const rawDelta =
        oif * 0.30 +
        nsf * 0.35 +
        noise * 0.35 +
        softPull;

      // Per-tick circuit breaker: ±2%
      const tickDelta = clamp(rawDelta, -0.02, 0.02);

      // Cumulative circuit breaker anchored to DAY open: ±15%
      const proposedPrice = stock.currentPrice * (1 + tickDelta);
      const maxPrice = stock.openPrice * 1.15;
      const minPrice = stock.openPrice * 0.85;
      const newPrice = +clamp(proposedPrice, minPrice, maxPrice).toFixed(2);

      const newDayHigh = Math.max(stock.dayHigh, newPrice);
      const newDayLow = Math.min(stock.dayLow, newPrice);
      const changeDay = +(newPrice - stock.openPrice).toFixed(2);
      const changePctDay = +((changeDay / stock.openPrice) * 100).toFixed(2);

      await ctx.db.patch(stock._id, {
        currentPrice: newPrice,
        dayHigh: newDayHigh,
        dayLow: newDayLow,
        changeDay,
        changePctDay,
        marketCap: newPrice * stock.sharesOutstanding,
      });

      // Record price history
      await ctx.db.insert("priceHistory", {
        stockId: stock._id,
        ticker: stock.ticker,
        price: newPrice,
        volumeTick: totalVolume,
        timestamp: now,
        microTick: newMicroTick,
      });
    }

    // Advance micro-tick counter
    await ctx.db.patch(state._id, {
      currentMicroTick: newMicroTick,
      lastMicroTickAt: now,
    });

    // Prune old price history (keep last 200 per stock — delete oldest)
    // Only prune every 20 ticks to avoid excessive DB writes
    if (newMicroTick % 20 === 0) {
      for (const stock of stocks) {
        const allHistory = await ctx.db
          .query("priceHistory")
          .withIndex("by_stock_time", (q) => q.eq("stockId", stock._id))
          .order("desc")
          .collect();
        if (allHistory.length > 200) {
          const toDelete = allHistory.slice(200);
          for (const row of toDelete) {
            await ctx.db.delete(row._id);
          }
        }
      }
    }

    return null;
  },
});

// ── Macro-tick: LLM sentiment update ──────────────────────────────────────────
// Calls Claude Haiku to generate net_sentiment_factor for each stock
// based on price trends, sector macro, and operational scores.

// Internal query to read market data for the action
export const getMacroTickData = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      isOpen: v.boolean(),
      stocks: v.array(v.object({
        ticker: v.string(),
        sector: v.string(),
        currentPrice: v.number(),
        macroOpenPrice: v.number(),
        volumeDay: v.number(),
        productQuality: v.number(),
        brandStrength: v.number(),
        innovationPipeline: v.number(),
        isListed: v.boolean(),
      })),
    }),
  ),
  handler: async (ctx) => {
    const state = await ctx.db.query("marketState").first();
    if (!state || !state.isOpen) return null;
    const stocks = await ctx.db.query("stocks").collect();
    return {
      isOpen: state.isOpen,
      stocks: stocks
        .filter((s) => s.isListed)
        .map((s) => ({
          ticker: s.ticker,
          sector: s.sector,
          currentPrice: s.currentPrice,
          macroOpenPrice: s.macroOpenPrice,
          volumeDay: s.volumeDay,
          productQuality: s.productQuality,
          brandStrength: s.brandStrength,
          innovationPipeline: s.innovationPipeline,
          isListed: s.isListed,
        })),
    };
  },
});

export const applyMacroTick = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const data = await ctx.runQuery(internal.priceEngine.getMacroTickData, {});
    if (!data || !data.isOpen) return null;

    const listedStocks = data.stocks;

    // Build TOON-style context for the LLM
    const stockSummaries = listedStocks.map((s) => {
      const priceChange = ((s.currentPrice - s.macroOpenPrice) / (s.macroOpenPrice || 1) * 100).toFixed(1);
      return `${s.ticker}:${s.sector}:${priceChange}%:vol${s.volumeDay}:pq${s.productQuality}:bs${s.brandStrength}:ip${s.innovationPipeline}`;
    }).join("\n");

    const prompt = `You are the MCSE Sentiment Modulator for the AEON fictional stock exchange.
Below are 57 listed stocks with their ticker, sector, price_change_pct_from_macro_open, day_volume, product_quality(0-100), brand_strength(0-100), innovation_pipeline(0-100).

${stockSummaries}

Generate a net_sentiment_factor for each stock in range [-0.03, +0.03].
Rules:
- Higher pq+bs+ip → generally more positive sentiment
- Stocks with large positive price change → mild reversion tendency
- Stocks with large negative price change → mild recovery tendency
- Add sector-level correlation (tech stocks move together slightly, etc.)
- Include some randomness so prices are dynamic and interesting
- Do NOT make every stock positive. Mix bullish, neutral, bearish.

Respond with ONLY a compact JSON object mapping ticker to sentiment_factor (2 decimal places, e.g. 0.01):
{"ESOFT":0.01,"ECLOUD":-0.02,...}
No explanation, no markdown, just the JSON object.`;

    let sentimentMap: Record<string, number> = {};

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          temperature: 0.4,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
      const data = await response.json() as { content: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text ?? "";

      // Extract JSON from response
      // Find first {...} block — use indexOf to avoid regex flag issues
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonMatch = jsonStart !== -1 && jsonEnd > jsonStart ? [text.slice(jsonStart, jsonEnd + 1)] : null;
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        for (const [ticker, val] of Object.entries(parsed)) {
          if (typeof val === "number") {
            sentimentMap[ticker] = clamp(val, -0.03, 0.03);
          }
        }
      }
    } catch (err) {
      console.error("LLM sentiment call failed, using fallback:", err);
      // Fallback: small random sentiment per stock
      for (const s of listedStocks) {
        sentimentMap[s.ticker] = clamp(gaussianNoise(0, 0.008), -0.03, 0.03);
      }
    }

    // Apply sentiment updates and reset macro open price
    await ctx.runMutation(internal.priceEngine.applyMacroSentiment, { sentimentMap });

    return null;
  },
});

export const applyMacroSentiment = internalMutation({
  args: { sentimentMap: v.any() },
  returns: v.null(),
  handler: async (ctx, { sentimentMap }) => {
    const state = await ctx.db.query("marketState").first();
    if (!state) return null;

    const stocks = await ctx.db.query("stocks").collect();
    const now = Date.now();

    for (const stock of stocks) {
      const nsf = (sentimentMap as Record<string, number>)[stock.ticker];
      const updates: Record<string, unknown> = {
        macroOpenPrice: stock.currentPrice, // reset circuit breaker window
      };
      if (typeof nsf === "number") {
        updates.netSentimentFactor = nsf;
      }
      await ctx.db.patch(stock._id, updates);
    }

    await ctx.db.patch(state._id, {
      currentMacroTick: state.currentMacroTick + 1,
      lastMacroTickAt: now,
    });

    return null;
  },
});

// ── Admin: open / close market ────────────────────────────────────────────────

export const openMarket = mutation({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    const state = await ctx.db.query("marketState").first();
    const now = Date.now();

    if (state) {
      await ctx.db.patch(state._id, {
        isOpen: true,
        openedAt: now,
        closedAt: undefined,
      });
    } else {
      await ctx.db.insert("marketState", {
        isOpen: true,
        currentMicroTick: 0,
        currentMacroTick: 0,
        dayNumber: 1,
        openedAt: now,
        lastMicroTickAt: now,
        lastMacroTickAt: now,
      });
    }

    // Set all stocks' openPrice to current price (start of day)
    // Also seed a small random netSentimentFactor so prices start moving
    // immediately (before first LLM macro-tick fires ~5 min later).
    const stocks = await ctx.db.query("stocks").collect();
    for (const s of stocks) {
      const initialNsf = (Math.random() - 0.5) * 0.01; // ±0.005
      await ctx.db.patch(s._id, {
        openPrice: s.currentPrice,
        dayHigh: s.currentPrice,
        dayLow: s.currentPrice,
        changeDay: 0,
        changePctDay: 0,
        volumeDay: 0,
        macroOpenPrice: s.currentPrice,
        netSentimentFactor: initialNsf,
      });
    }

    // Schedule the first LLM macro tick in 30 seconds (instead of waiting 5 min)
    await ctx.scheduler.runAfter(30_000, internal.priceEngine.applyMacroTick, {});
    await ctx.scheduler.runAfter(45_000, internal.news.generateMacroNews, {});

    return { success: true };
  },
});

export const closeMarket = mutation({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    const state = await ctx.db.query("marketState").first();
    if (!state) return { success: false };
    await ctx.db.patch(state._id, { isOpen: false, closedAt: Date.now() });
    return { success: true };
  },
});

// Reset all stock prices back to their original seed prices.
// Useful when prices have drifted too far during testing.
// Prices are computed from the original seed formula (sector_base × tier × quality).
export const resetPrices = mutation({
  args: {},
  returns: v.object({ resetCount: v.number() }),
  handler: async (ctx) => {
    const SECTOR_BASE: Record<string, number> = {
      Technology: 2200, Finance: 1400, Automotive: 1100,
      Pharmaceutical: 1900, Defense: 1700, Media: 750,
      "Consumer Goods": 550,
    };
    const TIER_MUL: Record<string, number> = { FLAGSHIP: 1.6, SECONDARY: 1.0, EMERGING: 0.55 };

    const stocks = await ctx.db.query("stocks").collect();
    let count = 0;
    for (const s of stocks) {
      const base = SECTOR_BASE[s.sector] ?? 1000;
      const qf = (s.productQuality * 0.4 + s.brandStrength * 0.3 + s.customerSatisfaction * 0.3) / 100;
      const tierMul = TIER_MUL[s.tier] ?? 1.0;
      const seedPrice = Math.round((base * tierMul * qf) / 5) * 5;

      await ctx.db.patch(s._id, {
        currentPrice: seedPrice,
        openPrice: seedPrice,
        macroOpenPrice: seedPrice,
        dayHigh: seedPrice,
        dayLow: seedPrice,
        changeDay: 0,
        changePctDay: 0,
        volumeDay: 0,
        netSentimentFactor: 0,
        marketCap: seedPrice * s.sharesOutstanding,
      });
      count++;
    }

    // Clear price history in small batches (Convex mutations cap at 4096 reads/writes).
    // Delete up to 2000 rows here; schedule follow-up batches if more remain.
    const batch = await ctx.db.query("priceHistory").take(2000);
    for (const h of batch) await ctx.db.delete(h._id);
    if (batch.length === 2000) {
      await ctx.scheduler.runAfter(0, internal.priceEngine.prunePriceHistoryBatch, {});
    }

    // Reset tick counters
    const state = await ctx.db.query("marketState").first();
    if (state) {
      await ctx.db.patch(state._id, {
        currentMicroTick: 0,
        currentMacroTick: 0,
        lastMicroTickAt: Date.now(),
        lastMacroTickAt: Date.now(),
      });
    }

    return { resetCount: count };
  },
});

// Internal mutation to delete price history in 2k-row batches.
// Re-schedules itself until the table is empty. Safe to run concurrently
// with live ticks (they just insert new rows the next batch will pick up).
export const prunePriceHistoryBatch = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const batch = await ctx.db.query("priceHistory").take(2000);
    for (const h of batch) await ctx.db.delete(h._id);
    if (batch.length === 2000) {
      await ctx.scheduler.runAfter(0, internal.priceEngine.prunePriceHistoryBatch, {});
    }
    return null;
  },
});
