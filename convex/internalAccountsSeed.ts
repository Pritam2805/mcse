"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { createHash } from "node:crypto";

/**
 * Bulk-seed all 20 internal accounts (admin + 19 company CEOs).
 *
 * Run once after `npx convex deploy`:
 *   npx convex run internalAccountsSeed:seedAll '{"accounts":[...]}' --prod
 *
 * Idempotent: re-running skips accounts whose email already exists.
 *
 * AUTH_PEPPER must be set in Convex env (and match the value in Vercel env
 * used by the login route).
 */

function hashPassword(password: string): string {
  const pepper = process.env.AUTH_PEPPER;
  if (!pepper) throw new Error("AUTH_PEPPER not set in Convex env");
  return createHash("sha256").update(password + pepper).digest("hex");
}

export const seedAll = action({
  args: {
    accounts: v.array(
      v.object({
        email: v.string(),
        password: v.string(),
        role: v.string(),
        ticker: v.optional(v.string()),
        displayName: v.optional(v.string()),
      }),
    ),
  },
  returns: v.object({ created: v.number(), skipped: v.number() }),
  handler: async (ctx, { accounts }) => {
    let created = 0;
    let skipped = 0;
    for (const a of accounts) {
      const result = await ctx.runMutation(api.internalAccounts.upsert, {
        emailLower: a.email.toLowerCase().trim(),
        passwordHash: hashPassword(a.password),
        role: a.role,
        ticker: a.ticker,
        displayName: a.displayName,
      });
      if (result === "created") created++;
      else skipped++;
    }
    return { created, skipped };
  },
});

export const resetPassword = action({
  args: { email: v.string(), newPassword: v.string() },
  returns: v.union(v.literal("ok"), v.literal("not_found")),
  handler: async (ctx, { email, newPassword }): Promise<"ok" | "not_found"> => {
    const result = await ctx.runMutation(api.internalAccounts.updatePasswordHash, {
      emailLower: email.toLowerCase().trim(),
      passwordHash: hashPassword(newPassword),
    });
    return result;
  },
});
