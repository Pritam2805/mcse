import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Auth ────────────────────────────────────────────────────────────────
  investors: defineTable({
    registrationId: v.string(),
    email: v.string(),
    name: v.string(),
    teamName: v.optional(v.string()),
    balance: v.number(),
    createdAt: v.number(),
  })
    .index("by_registration", ["registrationId"])
    .index("by_email", ["email"]),

  sessions: defineTable({
    tokenHash: v.string(),
    investorId: v.id("investors"),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["tokenHash"])
    .index("by_investor", ["investorId"]),

  loginAttempts: defineTable({
    emailLower: v.string(),
    ip: v.string(),
    succeeded: v.boolean(),
    at: v.number(),
  })
    .index("by_email_at", ["emailLower", "at"])
    .index("by_ip_at", ["ip", "at"]),

  // ── Role allowlist ──────────────────────────────────────────────────────
  // Promotes a real (mu-aeon-validated) email to admin or company role.
  // Looked up at login time, before falling back to env vars / local-part
  // conventions. Edit rows live in the Convex dashboard — no redeploy.
  //   role = "admin"     → ticker is ignored
  //   role = "company"   → ticker required (ENIGMA, ACM, etc.)
  roleAssignments: defineTable({
    emailLower: v.string(),
    role: v.string(),                  // "admin" | "company"
    ticker: v.optional(v.string()),    // required when role = "company"
    note: v.optional(v.string()),      // free-form (CEO name, etc.)
  }).index("by_email", ["emailLower"]),

  // ── Internal accounts (admin + 19 company CEOs) ─────────────────────────
  // These accounts are owned by US, not mu-aeon. Login route checks this
  // table FIRST; if email matches and password hash matches, mu-aeon is
  // bypassed entirely. If no match, falls through to the mu-aeon flow
  // (which is what the 193 student accounts use).
  //
  // Password hashing: SHA-256 of (password + AUTH_PEPPER env var). The
  // pepper must be set identically in both Convex and Vercel env.
  internalAccounts: defineTable({
    emailLower: v.string(),
    passwordHash: v.string(),
    role: v.string(),                  // "admin" | "company"
    ticker: v.optional(v.string()),    // required when role = "company"
    displayName: v.optional(v.string()),
  }).index("by_email", ["emailLower"]),

  // ── Market Entities ─────────────────────────────────────────────────────
  holdingCompanies: defineTable({
    slug: v.string(),
    name: v.string(),
    ticker: v.string(),
    sector: v.string(),
    about: v.string(),
    logoLetter: v.string(),
  })
    .index("by_ticker", ["ticker"])
    .index("by_slug", ["slug"]),

  stocks: defineTable({
    holdingId: v.id("holdingCompanies"),
    ticker: v.string(),
    name: v.string(),
    sector: v.string(),
    tier: v.union(v.literal("FLAGSHIP"), v.literal("SECONDARY"), v.literal("EMERGING")),

    // Live price
    currentPrice: v.number(),
    openPrice: v.number(),
    dayHigh: v.number(),
    dayLow: v.number(),
    changeDay: v.number(),
    changePctDay: v.number(),
    volumeDay: v.number(),

    // Shares
    sharesOutstanding: v.number(),
    floatShares: v.number(),

    // Financials
    revenue: v.number(),
    expenses: v.number(),
    profit: v.number(),
    rdInvestment: v.number(),
    marketingSpend: v.number(),
    cash: v.number(),
    debt: v.number(),
    assets: v.number(),
    liabilities: v.number(),

    // Operational scores (0–100)
    productQuality: v.number(),
    customerSatisfaction: v.number(),
    innovationPipeline: v.number(),
    brandStrength: v.number(),
    employeeCount: v.number(),

    // Derived
    marketCap: v.number(),

    // Sentiment (updated by LLM macro-tick)
    netSentimentFactor: v.number(),

    // Circuit breaker: price at start of current macro tick
    macroOpenPrice: v.number(),

    isListed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_ticker", ["ticker"])
    .index("by_holding", ["holdingId"])
    .index("by_sector", ["sector"]),

  // Rolling price snapshots
  priceHistory: defineTable({
    stockId: v.id("stocks"),
    ticker: v.string(),
    price: v.number(),
    volumeTick: v.number(),
    timestamp: v.number(),
    microTick: v.number(),
  })
    .index("by_stock_time", ["stockId", "timestamp"])
    .index("by_ticker_time", ["ticker", "timestamp"]),

  // ── Trading ─────────────────────────────────────────────────────────────
  portfolio: defineTable({
    investorId: v.id("investors"),
    stockId: v.id("stocks"),
    ticker: v.string(),
    stockName: v.string(),
    quantity: v.number(),
    avgPrice: v.number(),
    totalCost: v.number(),
    updatedAt: v.number(),
  })
    .index("by_investor", ["investorId"])
    .index("by_investor_ticker", ["investorId", "ticker"]),

  orders: defineTable({
    investorId: v.id("investors"),
    stockId: v.id("stocks"),
    ticker: v.string(),
    stockName: v.string(),
    side: v.union(v.literal("BUY"), v.literal("SELL")),
    orderType: v.union(v.literal("DELIVERY"), v.literal("INTRADAY")),
    pricingType: v.union(v.literal("MARKET"), v.literal("LIMIT")),
    quantity: v.number(),
    price: v.number(),
    limitPrice: v.optional(v.number()),
    total: v.number(),
    status: v.union(v.literal("COMPLETED"), v.literal("PENDING"), v.literal("CANCELLED")),
    timestamp: v.number(),
  })
    .index("by_investor", ["investorId"])
    .index("by_investor_time", ["investorId", "timestamp"])
    .index("by_ticker_time", ["ticker", "timestamp"]),

  transactions: defineTable({
    investorId: v.id("investors"),
    type: v.union(v.literal("BUY"), v.literal("SELL"), v.literal("DEPOSIT")),
    ticker: v.optional(v.string()),
    stockName: v.optional(v.string()),
    quantity: v.optional(v.number()),
    price: v.optional(v.number()),
    amount: v.number(),
    balanceAfter: v.number(),
    description: v.string(),
    timestamp: v.number(),
  }).index("by_investor_time", ["investorId", "timestamp"]),

  // ── Watchlist ───────────────────────────────────────────────────────────
  watchlist: defineTable({
    investorId: v.id("investors"),
    ticker: v.string(),
    stockName: v.string(),
    sector: v.string(),
    priceAlertAbove: v.optional(v.number()),
    priceAlertBelow: v.optional(v.number()),
    addedAt: v.number(),
  })
    .index("by_investor", ["investorId"])
    .index("by_investor_ticker", ["investorId", "ticker"]),

  // ── News (LLM-generated per macro tick + company/admin submissions) ────
  news: defineTable({
    headline: v.string(),
    body: v.string(),
    relatedTickers: v.array(v.string()),
    sentiment: v.number(),
    confidence: v.number(),
    source: v.union(
      v.literal("LLM_MACRO"),
      v.literal("LLM_SPONTANEOUS"),
      v.literal("ADMIN"),
      v.literal("COMPANY"),
    ),
    // Approval workflow (only meaningful for COMPANY source; LLM + ADMIN
    // items are implicitly APPROVED and may omit this field for back-compat).
    status: v.optional(
      v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED")),
    ),
    submittedBy: v.optional(v.id("investors")),   // who posted the company item
    reviewedBy: v.optional(v.id("investors")),    // which admin approved/rejected
    reviewedAt: v.optional(v.number()),
    macroTick: v.number(),
    publishedAt: v.number(),
  })
    .index("by_published", ["publishedAt"])
    .index("by_submitter", ["submittedBy"]),

  // ── Market State ────────────────────────────────────────────────────────
  marketState: defineTable({
    isOpen: v.boolean(),
    currentMicroTick: v.number(),
    currentMacroTick: v.number(),
    dayNumber: v.number(),
    openedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    lastMicroTickAt: v.number(),
    lastMacroTickAt: v.number(),
  }),
});
