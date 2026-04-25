import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Internal accounts (admin + 19 company CEOs) — bypass mu-aeon.
 *
 * Password hashing happens in the Next.js login route (which has node:crypto
 * available). Convex just stores hashes and compares them — no node modules
 * needed here, so this file stays in the V8 isolate (fast).
 *
 * Seeding (which needs to hash plaintext) lives in internalAccountsSeed.ts
 * with "use node".
 */

/**
 * Validate a login attempt. Caller (the Next.js route) computes
 * sha256(password + AUTH_PEPPER) and passes the result. We compare and
 * return the account on match, null otherwise. Constant-time-ish — fine
 * for a 20-account internal table.
 */
export const validateLoginByHash = query({
  args: { emailLower: v.string(), providedHash: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      emailLower: v.string(),
      role: v.string(),
      ticker: v.optional(v.string()),
      displayName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { emailLower, providedHash }) => {
    const row = await ctx.db
      .query("internalAccounts")
      .withIndex("by_email", (q) => q.eq("emailLower", emailLower))
      .first();
    if (!row) return null;
    if (row.passwordHash !== providedHash) return null;
    return {
      emailLower: row.emailLower,
      role: row.role,
      ticker: row.ticker,
      displayName: row.displayName,
    };
  },
});

/** Inserts or skips if email already exists. Used by the seed action. */
export const upsert = mutation({
  args: {
    emailLower: v.string(),
    passwordHash: v.string(),
    role: v.string(),
    ticker: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  returns: v.union(v.literal("created"), v.literal("skipped")),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("internalAccounts")
      .withIndex("by_email", (q) => q.eq("emailLower", args.emailLower))
      .first();
    if (existing) return "skipped";
    await ctx.db.insert("internalAccounts", args);
    return "created";
  },
});

/** Used by the password-reset action. */
export const updatePasswordHash = mutation({
  args: { emailLower: v.string(), passwordHash: v.string() },
  returns: v.union(v.literal("ok"), v.literal("not_found")),
  handler: async (ctx, { emailLower, passwordHash }) => {
    const row = await ctx.db
      .query("internalAccounts")
      .withIndex("by_email", (q) => q.eq("emailLower", emailLower))
      .first();
    if (!row) return "not_found";
    await ctx.db.patch(row._id, { passwordHash });
    return "ok";
  },
});
