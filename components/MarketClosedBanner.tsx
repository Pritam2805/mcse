"use client";

import { Lock } from "lucide-react";
import { useMarketState } from "@/lib/useMarketState";

/**
 * App-wide banner shown when an admin has paused/closed the market.
 * Reactive — appears/disappears within ~100ms of the admin click.
 *
 * While closed:
 *   • Investors see this banner across every page
 *   • The placeOrder Convex mutation rejects all buy/sell submissions
 *   • Prices still tick because the price-engine cron stops only on close
 *     (so visually the market freezes; on resume the cron picks back up)
 */
export default function MarketClosedBanner() {
  const { isOpen, ready } = useMarketState();

  // Don't flash anything before the first snapshot arrives.
  if (!ready || isOpen) return null;

  return (
    <div className="bg-down/10 border-b border-down/40 text-down px-4 py-2 flex items-center justify-center gap-2 text-[11px] tracking-[0.1em]">
      <Lock size={12} />
      <span className="font-medium">MARKET CLOSED</span>
      <span className="text-down/70 hidden sm:inline">
        · Trading is paused. New orders cannot be placed until the market reopens.
      </span>
      <span className="text-down/70 sm:hidden">· trading paused</span>
    </div>
  );
}
