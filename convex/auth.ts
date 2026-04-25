import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const STARTING_BALANCE = 200_000; // ₹2,00,000 — enough for a meaningful diversified portfolio
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_FAILURES = 5;

export const rateLimitCheck = query({
  args: { emailLower: v.string(), ip: v.string() },
  returns: v.object({ allowed: v.boolean(), failures: v.number() }),
  handler: async (ctx, { emailLower, ip: _ip }) => {
    // Per-email rate limit only. The IP-based check was removed because all
    // event participants share a single campus NAT IP — 5 failed attempts from
    // any one student would otherwise lock out the rest. Per-email is enough
    // to stop brute-force against a single account.
    const since = Date.now() - RATE_WINDOW_MS;
    const byEmail = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email_at", (q) => q.eq("emailLower", emailLower).gte("at", since))
      .collect();
    const failures = byEmail.filter((a) => !a.succeeded).length;
    return { allowed: failures < RATE_MAX_FAILURES, failures };
  },
});

// Look up a role assignment for an email (case-insensitive).
// Returns null if the email is not in the allowlist — caller should fall back
// to env vars / local-part convention / "user" default.
export const getRoleForEmail = query({
  args: { emailLower: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      role: v.string(),
      ticker: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { emailLower }) => {
    const row = await ctx.db
      .query("roleAssignments")
      .withIndex("by_email", (q) => q.eq("emailLower", emailLower))
      .first();
    if (!row) return null;
    return { role: row.role, ticker: row.ticker };
  },
});

export const recordLoginAttempt = mutation({
  args: { emailLower: v.string(), ip: v.string(), succeeded: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { emailLower, ip, succeeded }) => {
    await ctx.db.insert("loginAttempts", {
      emailLower,
      ip,
      succeeded,
      at: Date.now(),
    });
    return null;
  },
});

export const provisionSession = mutation({
  args: {
    registrationId: v.string(),
    email: v.string(),
    participantName: v.string(),
    teamName: v.optional(v.string()),
    tokenHash: v.string(),
    expiresAt: v.number(),
    role: v.optional(v.string()),
  },
  returns: v.object({
    investorId: v.id("investors"),
    sessionId: v.id("sessions"),
    balance: v.number(),
    name: v.string(),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("investors")
      .withIndex("by_registration", (q) => q.eq("registrationId", args.registrationId))
      .unique();

    let investor: Doc<"investors">;
    if (existing) {
      investor = existing;
    } else {
      const id = await ctx.db.insert("investors", {
        registrationId: args.registrationId,
        email: args.email,
        name: args.participantName,
        teamName: args.teamName,
        balance: STARTING_BALANCE,
        createdAt: Date.now(),
      });
      const fresh = await ctx.db.get(id);
      if (!fresh) throw new Error("investor disappeared after insert");
      investor = fresh;
    }

    const sessionId = await ctx.db.insert("sessions", {
      tokenHash: args.tokenHash,
      investorId: investor._id,
      role: args.role,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });

    return {
      investorId: investor._id,
      sessionId,
      balance: investor.balance,
      name: investor.name,
      email: investor.email,
    };
  },
});

/**
 * Returns the role of the session's owner. Used by server-side guards on
 * /api/admin/* and /api/company/* endpoints. Returns null for missing or
 * expired sessions.
 */
export const getSessionRole = query({
  args: { tokenHash: v.string() },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;
    return session.role ?? "user";
  },
});

export const getInvestorBySession = query({
  args: { tokenHash: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      investorId: v.id("investors"),
      email: v.string(),
      name: v.string(),
      teamName: v.union(v.string(), v.null()),
      balance: v.number(),
    }),
  ),
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;
    const investor = await ctx.db.get(session.investorId);
    if (!investor) return null;
    return {
      investorId: investor._id,
      email: investor.email,
      name: investor.name,
      teamName: investor.teamName ?? null,
      balance: investor.balance,
    };
  },
});

export const revokeSession = mutation({
  args: { tokenHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
    return null;
  },
});
