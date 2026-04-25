import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ─── News LLM Generator (per macro-tick) ────────────────────────────────────
// Calls Claude Haiku to produce 3–5 news items based on recent market state.
// Stored in `news` table with source=LLM_MACRO.

export const getNewsContext = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      currentMacroTick: v.number(),
      isOpen: v.boolean(),
      stocks: v.array(
        v.object({
          ticker: v.string(),
          sector: v.string(),
          currentPrice: v.number(),
          macroOpenPrice: v.number(),
          productQuality: v.number(),
          brandStrength: v.number(),
          innovationPipeline: v.number(),
          volumeDay: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx) => {
    const state = await ctx.db.query("marketState").first();
    if (!state || !state.isOpen) return null;
    const stocks = await ctx.db.query("stocks").collect();
    return {
      currentMacroTick: state.currentMacroTick,
      isOpen: state.isOpen,
      stocks: stocks
        .filter((s) => s.isListed)
        .map((s) => ({
          ticker: s.ticker,
          sector: s.sector,
          currentPrice: s.currentPrice,
          macroOpenPrice: s.macroOpenPrice,
          productQuality: s.productQuality,
          brandStrength: s.brandStrength,
          innovationPipeline: s.innovationPipeline,
          volumeDay: s.volumeDay,
        })),
    };
  },
});

export const insertNewsBatch = internalMutation({
  args: {
    items: v.array(
      v.object({
        headline: v.string(),
        body: v.string(),
        relatedTickers: v.array(v.string()),
        sentiment: v.number(),
        confidence: v.number(),
      }),
    ),
    macroTick: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { items, macroTick }) => {
    const now = Date.now();
    for (const it of items) {
      await ctx.db.insert("news", {
        headline: it.headline,
        body: it.body,
        relatedTickers: it.relatedTickers,
        sentiment: Math.max(-1, Math.min(1, it.sentiment)),
        confidence: Math.max(0, Math.min(1, it.confidence)),
        source: "LLM_MACRO",
        macroTick,
        publishedAt: now,
      });
    }

    // Prune: keep last 200 news items overall
    const all = await ctx.db.query("news").withIndex("by_published").order("desc").collect();
    if (all.length > 200) {
      for (const row of all.slice(200)) {
        await ctx.db.delete(row._id);
      }
    }
    return null;
  },
});

export const generateMacroNews = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const data = await ctx.runQuery(internal.news.getNewsContext, {});
    if (!data || !data.isOpen) return null;

    // Find most interesting stocks (biggest movers + highest volume)
    const sortedByAbsMove = [...data.stocks].sort((a, b) => {
      const moveA = Math.abs((a.currentPrice - a.macroOpenPrice) / (a.macroOpenPrice || 1));
      const moveB = Math.abs((b.currentPrice - b.macroOpenPrice) / (b.macroOpenPrice || 1));
      return moveB - moveA;
    });
    const topMovers = sortedByAbsMove.slice(0, 10);

    const stockLines = topMovers.map((s) => {
      const movePct = ((s.currentPrice - s.macroOpenPrice) / (s.macroOpenPrice || 1) * 100).toFixed(1);
      return `${s.ticker}(${s.sector}): ${movePct}%, vol ${s.volumeDay}, pq ${s.productQuality}, bs ${s.brandStrength}, ip ${s.innovationPipeline}`;
    }).join("\n");

    const prompt = `You are a financial news reporter covering the AEON fictional stock exchange (MCSE).
Generate 3 concise, realistic news items based on the market action below.

Top movers this macro tick:
${stockLines}

All listed sectors: Technology, Finance, Automotive, Pharmaceutical, Defense, Media, Consumer Goods.

Rules:
- Mix of stock-specific news (naming 1–2 tickers) and broader market/sector news
- Headlines: 5–12 words, punchy, like Bloomberg/Reuters
- Body: 2–3 sentences, plausible financial storyline
- sentiment: -1.0 to +1.0 (very negative to very positive)
- confidence: 0.5 to 0.95 (how certain the story is)
- relatedTickers: array of ticker strings that are mentioned or affected (can be empty for macro news)

Respond with ONLY a JSON array, no markdown, no explanation:
[
  {"headline":"...", "body":"...", "relatedTickers":["ESOFT"], "sentiment":0.4, "confidence":0.75},
  {"headline":"...", "body":"...", "relatedTickers":["ENAI","ECLOUD"], "sentiment":-0.3, "confidence":0.65},
  {"headline":"...", "body":"...", "relatedTickers":[], "sentiment":0.1, "confidence":0.8}
]`;

    let items: Array<{ headline: string; body: string; relatedTickers: string[]; sentiment: number; confidence: number }> = [];

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
          max_tokens: 1200,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
      const body = await response.json() as { content: Array<{ type: string; text: string }> };
      const text = body.content?.[0]?.text ?? "";

      // Find the first [...] block
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      if (start !== -1 && end > start) {
        const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
        if (Array.isArray(parsed)) {
          for (const raw of parsed) {
            if (
              raw && typeof raw === "object" &&
              typeof (raw as any).headline === "string" &&
              typeof (raw as any).body === "string"
            ) {
              items.push({
                headline: String((raw as any).headline),
                body: String((raw as any).body),
                relatedTickers: Array.isArray((raw as any).relatedTickers)
                  ? (raw as any).relatedTickers.filter((t: unknown) => typeof t === "string")
                  : [],
                sentiment: typeof (raw as any).sentiment === "number" ? (raw as any).sentiment : 0,
                confidence: typeof (raw as any).confidence === "number" ? (raw as any).confidence : 0.7,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("News LLM failed:", err);
    }

    if (items.length === 0) {
      // Fallback: generate simple news from top mover
      const top = topMovers[0];
      if (top) {
        const movePct = ((top.currentPrice - top.macroOpenPrice) / (top.macroOpenPrice || 1) * 100);
        const direction = movePct >= 0 ? "rallies" : "slips";
        items.push({
          headline: `${top.ticker} ${direction} ${Math.abs(movePct).toFixed(1)}% amid sector repositioning`,
          body: `${top.ticker} saw significant movement this tick as investors repositioned portfolios in the ${top.sector} sector. Trading volume reached ${top.volumeDay} shares.`,
          relatedTickers: [top.ticker],
          sentiment: movePct >= 0 ? 0.3 : -0.3,
          confidence: 0.6,
        });
      }
    }

    if (items.length > 0) {
      await ctx.runMutation(internal.news.insertNewsBatch, {
        items,
        macroTick: data.currentMacroTick,
      });
    }

    return null;
  },
});

// ─── Company / Admin-submitted news ─────────────────────────────────────────

import { mutation as publicMutation } from "./_generated/server";

export const submitCompanyNews = publicMutation({
  args: {
    headline: v.string(),
    body: v.string(),
    relatedTickers: v.array(v.string()),
    source: v.optional(v.union(v.literal("COMPANY"), v.literal("ADMIN"))),
    tokenHash: v.optional(v.string()),
  },
  returns: v.object({ id: v.id("news") }),
  handler: async (ctx, { headline, body, relatedTickers, source = "COMPANY", tokenHash }) => {
    const state = await ctx.db.query("marketState").first();
    const macroTick = state?.currentMacroTick ?? 0;

    // Look up the submitter (for the company dashboard "my news" view).
    let submittedBy: Id<"investors"> | undefined;
    if (tokenHash) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
        .unique();
      if (session && session.expiresAt > Date.now()) submittedBy = session.investorId;
    }

    // COMPANY submissions land as PENDING and are invisible to investors
    // until an admin approves. ADMIN submissions are immediately APPROVED.
    const status: "PENDING" | "APPROVED" =
      source === "ADMIN" ? "APPROVED" : "PENDING";

    const id = await ctx.db.insert("news", {
      headline: headline.slice(0, 160),
      body: body.slice(0, 2000),
      relatedTickers: relatedTickers.map((t) => t.toUpperCase()).slice(0, 5),
      sentiment: 0,
      confidence: 0.8,
      source,
      status,
      submittedBy,
      macroTick,
      publishedAt: Date.now(),
    });

    console.log(
      `[news.submit] id=${id} source=${source} status=${status} ` +
      `submitter=${submittedBy ?? "anonymous"} headline="${headline.slice(0, 60)}"`,
    );

    return { id };
  },
});

// Admin approves a pending news item — makes it visible on /news.
export const approveNews = publicMutation({
  args: { id: v.id("news"), reviewerTokenHash: v.optional(v.string()) },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { id, reviewerTokenHash }) => {
    const row = await ctx.db.get(id);
    if (!row) return { ok: false };

    let reviewedBy: Id<"investors"> | undefined;
    if (reviewerTokenHash) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("tokenHash", reviewerTokenHash))
        .unique();
      if (session && session.expiresAt > Date.now()) reviewedBy = session.investorId;
    }

    await ctx.db.patch(id, {
      status: "APPROVED",
      reviewedBy,
      reviewedAt: Date.now(),
    });
    console.log(
      `[news.approve] id=${id} reviewer=${reviewedBy ?? "anonymous"} ` +
      `was=${row.status ?? "(no status)"} headline="${row.headline.slice(0, 60)}"`,
    );
    return { ok: true };
  },
});

// Admin rejects a pending news item — hides it from investors; the
// company dashboard still shows it so the submitter sees the decision.
export const rejectNews = publicMutation({
  args: { id: v.id("news"), reviewerTokenHash: v.optional(v.string()) },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { id, reviewerTokenHash }) => {
    const row = await ctx.db.get(id);
    if (!row) return { ok: false };

    let reviewedBy: Id<"investors"> | undefined;
    if (reviewerTokenHash) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("tokenHash", reviewerTokenHash))
        .unique();
      if (session && session.expiresAt > Date.now()) reviewedBy = session.investorId;
    }

    await ctx.db.patch(id, {
      status: "REJECTED",
      reviewedBy,
      reviewedAt: Date.now(),
    });
    console.log(
      `[news.reject] id=${id} reviewer=${reviewedBy ?? "anonymous"} ` +
      `was=${row.status ?? "(no status)"} headline="${row.headline.slice(0, 60)}"`,
    );
    return { ok: true };
  },
});

// Returns all news submitted by the currently-logged-in user — for the
// company dashboard "my submissions" view. Shows PENDING / APPROVED / REJECTED.
export const listMyNews = query({
  args: { tokenHash: v.string() },
  returns: v.array(
    v.object({
      id: v.id("news"),
      headline: v.string(),
      body: v.string(),
      relatedTickers: v.array(v.string()),
      source: v.string(),
      status: v.union(v.string(), v.null()),
      publishedAt: v.number(),
      reviewedAt: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!session || session.expiresAt < Date.now()) return [];

    const rows = await ctx.db
      .query("news")
      .withIndex("by_submitter", (q) => q.eq("submittedBy", session.investorId))
      .order("desc")
      .take(100);

    return rows.map((r) => ({
      id: r._id,
      headline: r.headline,
      body: r.body,
      relatedTickers: r.relatedTickers,
      source: r.source,
      status: r.status ?? null,
      publishedAt: r.publishedAt,
      reviewedAt: r.reviewedAt ?? null,
    }));
  },
});

export const deleteNewsItem = publicMutation({
  args: { id: v.id("news") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return { ok: false };
    await ctx.db.delete(id);
    return { ok: true };
  },
});

// ─── Public queries ─────────────────────────────────────────────────────────

export const listNews = query({
  args: { limit: v.optional(v.number()), ticker: v.optional(v.string()) },
  returns: v.array(
    v.object({
      id: v.id("news"),
      headline: v.string(),
      body: v.string(),
      relatedTickers: v.array(v.string()),
      sentiment: v.number(),
      confidence: v.number(),
      source: v.string(),
      macroTick: v.number(),
      publishedAt: v.number(),
    }),
  ),
  handler: async (ctx, { limit = 40, ticker }) => {
    const rows = await ctx.db
      .query("news")
      .withIndex("by_published")
      .order("desc")
      .take(limit * 4); // over-fetch so we can drop pending items and still fill

    // Investor feed rules:
    //   • LLM-generated items are always visible.
    //   • ADMIN items are always visible.
    //   • COMPANY items are visible only if status === "APPROVED".
    //   • PENDING / REJECTED company items are hidden.
    const visible = rows.filter((r) => {
      if (r.source !== "COMPANY") return true; // LLM + ADMIN always public
      return r.status === "APPROVED";
    });

    const filtered = ticker
      ? visible.filter((r) => r.relatedTickers.includes(ticker.toUpperCase()))
      : visible;

    return filtered.slice(0, limit).map((r) => ({
      id: r._id,
      headline: r.headline,
      body: r.body,
      relatedTickers: r.relatedTickers,
      sentiment: r.sentiment,
      confidence: r.confidence,
      source: r.source,
      macroTick: r.macroTick,
      publishedAt: r.publishedAt,
    }));
  },
});

// Admin-facing: returns ALL news items regardless of status, so the
// approval queue can show PENDING / APPROVED / REJECTED side-by-side.
// Joins with `investors` so the admin UI can display WHO submitted what.
export const listAllNews = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      id: v.id("news"),
      headline: v.string(),
      body: v.string(),
      relatedTickers: v.array(v.string()),
      sentiment: v.number(),
      confidence: v.number(),
      source: v.string(),
      status: v.union(v.string(), v.null()),
      authorName: v.union(v.string(), v.null()),
      authorEmail: v.union(v.string(), v.null()),
      macroTick: v.number(),
      publishedAt: v.number(),
      reviewedAt: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, { limit = 200 }) => {
    const rows = await ctx.db
      .query("news")
      .withIndex("by_published")
      .order("desc")
      .take(limit);

    const results = [];
    for (const r of rows) {
      const submitter = r.submittedBy ? await ctx.db.get(r.submittedBy) : null;
      results.push({
        id: r._id,
        headline: r.headline,
        body: r.body,
        relatedTickers: r.relatedTickers,
        sentiment: r.sentiment,
        confidence: r.confidence,
        source: r.source,
        status: r.status ?? null,
        authorName: submitter?.name ?? null,
        authorEmail: submitter?.email ?? null,
        macroTick: r.macroTick,
        publishedAt: r.publishedAt,
        reviewedAt: r.reviewedAt ?? null,
      });
    }
    return results;
  },
});

export const getNewsItem = query({
  args: { id: v.id("news") },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("news"),
      headline: v.string(),
      body: v.string(),
      relatedTickers: v.array(v.string()),
      sentiment: v.number(),
      confidence: v.number(),
      source: v.string(),
      macroTick: v.number(),
      publishedAt: v.number(),
    }),
  ),
  handler: async (ctx, { id }) => {
    const r = await ctx.db.get(id);
    if (!r) return null;
    return {
      id: r._id,
      headline: r.headline,
      body: r.body,
      relatedTickers: r.relatedTickers,
      sentiment: r.sentiment,
      confidence: r.confidence,
      source: r.source,
      macroTick: r.macroTick,
      publishedAt: r.publishedAt,
    };
  },
});
