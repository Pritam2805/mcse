"use client";

import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { Search, ArrowLeft, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Portal from "@/components/Portal";
import { getScreener, type ScreenerItem } from "@/lib/api";

interface LiveStock {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

function subscribeMQ(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMQ,
    () => window.matchMedia("(max-width: 767px)").matches,
    () => true,
  );
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export default function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);
  const [stocks, setStocks] = useState<LiveStock[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setQuery("");
  }

  // Load live stocks when modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      const res = await getScreener();
      if (cancelled || !res.data) return;
      const live: LiveStock[] = res.data.map((s: ScreenerItem) => ({
        ticker: s.ticker,
        name: s.name,
        price: s.price,
        changePercent: s.change_pct,
      }));
      setStocks(live);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open && isMobile) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open, isMobile]);

  const debouncedQuery = useDebouncedValue(query, 150);

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    return stocks.filter(
      (s) =>
        s.ticker.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q),
    );
  }, [debouncedQuery, stocks]);

  // Top movers as "trending" — simply the biggest absolute movers.
  const trending = useMemo(() => {
    return [...stocks]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5);
  }, [stocks]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hasQuery = query.trim().length > 0;

  if (!isMobile) return null;

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-bg z-[60] flex flex-col"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Search header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center shrink-0 -ml-2"
            >
              <ArrowLeft size={20} className="text-white/60" />
            </button>
            <div className="flex-1 flex items-center gap-2.5 bg-white/[0.06] px-4 py-3">
              <Search size={16} className="text-white/30 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stocks…"
                className="flex-1 bg-transparent text-white outline-none placeholder:text-white/25"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {!hasQuery ? (
              <div className="px-4 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} className="text-white/30" />
                  <p className="text-[10px] tracking-[0.15em] text-white/30 font-medium">TOP MOVERS</p>
                </div>
                <div className="space-y-1">
                  {trending.length === 0 ? (
                    <p className="text-[11px] text-white/25 py-4">Loading…</p>
                  ) : trending.map((s) => (
                    <SearchRow key={s.ticker} stock={s} onClose={onClose} />
                  ))}
                </div>

                <p className="text-[10px] tracking-[0.15em] text-white/30 font-medium mt-8 mb-4">ALL STOCKS</p>
                <div className="space-y-1">
                  {stocks.slice(0, 30).map((s) => (
                    <SearchRow key={s.ticker} stock={s} onClose={onClose} />
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-[11px] text-white/25 tracking-[0.1em]">NO RESULTS FOUND</p>
                <p className="text-[10px] text-white/15 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-1 px-4 pt-4">
                {results.map((s) => (
                  <SearchRow key={s.ticker} stock={s} onClose={onClose} />
                ))}
                <div className="px-1 py-3 text-center">
                  <span className="text-[9px] text-white/20 tracking-[0.1em]">
                    {results.length} RESULT{results.length !== 1 ? "S" : ""}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  );
}

function SearchRow({ stock: s, onClose }: { stock: LiveStock; onClose: () => void }) {
  return (
    <Link
      href={`/stock/${s.ticker}`}
      onClick={onClose}
      className="flex items-center gap-4 py-3 px-1 border-b border-white/6 active:bg-white/[0.04] transition-colors"
    >
      <div className="w-10 h-10 border border-white/15 flex items-center justify-center shrink-0">
        <span className="text-[9px] tracking-[0.1em] text-white/40">{s.ticker.slice(0, 3)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{s.ticker}</p>
        <p className="text-[10px] text-white/30 truncate">{s.name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-[var(--font-anton)] text-[13px]">{"₹"}{s.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        <p className={`text-[10px] font-medium ${s.changePercent >= 0 ? "text-up" : "text-down"}`}>
          {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
        </p>
      </div>
    </Link>
  );
}
