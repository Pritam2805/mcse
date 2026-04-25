"use client";

import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { Search, ArrowLeft, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { stockDirectory } from "@/lib/mockData";
import Sparkline from "@/components/Sparkline";
import Portal from "@/components/Portal";
import {
  SEARCH_FILTERS,
  type SearchFilter,
  computeResults,
  sectionCaption,
  ResultRow,
  resultKey,
} from "@/components/searchResults";

const allStocks = Object.values(stockDirectory);
const trendingTickers = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ITC"];
const trending = trendingTickers.map(t => stockDirectory[t]).filter(Boolean);

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
  const [filter, setFilter] = useState<SearchFilter>("ALL");
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setFilter("ALL");
    }
  }

  useEffect(() => {
    if (open && isMobile) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open, isMobile]);

  const debouncedQuery = useDebouncedValue(query, 150);
  const results = useMemo(() => computeResults(debouncedQuery, filter), [debouncedQuery, filter]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hasQuery = query.trim().length > 0;
  const showResults = hasQuery || filter !== "ALL";
  const caption = sectionCaption(filter, hasQuery);

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
                placeholder="Search stocks, news…"
                className="flex-1 bg-transparent text-white outline-none placeholder:text-white/25"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 shrink-0 overflow-x-auto scrollbar-hide">
            {SEARCH_FILTERS.map((chip) => {
              const active = filter === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setFilter(chip)}
                  className={`px-4 py-2.5 text-[10px] tracking-[0.12em] font-medium border whitespace-nowrap transition-colors duration-200 ${
                    active
                      ? "bg-white text-black border-white"
                      : "text-white/50 border-white/15 active:bg-white/10"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {!showResults ? (
              /* Trending section (no query, ALL filter) */
              <div className="px-4 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} className="text-white/30" />
                  <p className="text-[10px] tracking-[0.15em] text-white/30 font-medium">TRENDING</p>
                </div>
                <div className="space-y-1">
                  {trending.map((s) => (
                    <Link
                      key={s.ticker}
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
                        <p className="font-[var(--font-anton)] text-[13px]">{"\u20B9"}{s.price.toLocaleString("en-IN")}</p>
                        <p className={`text-[10px] font-medium ${s.changePercent >= 0 ? "text-up" : "text-down"}`}>
                          {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                <p className="text-[10px] tracking-[0.15em] text-white/30 font-medium mt-8 mb-4">ALL STOCKS</p>
                <div className="space-y-1">
                  {allStocks.slice(0, 15).map((s) => (
                    <Link
                      key={s.ticker}
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
                      <div className="shrink-0 mr-2">
                        <Sparkline data={s.chartData["1D"].map((d) => d.price)} width={50} height={18} positive={s.changePercent >= 0} />
                      </div>
                      <div className="text-right shrink-0 min-w-[70px]">
                        <p className="font-[var(--font-anton)] text-[13px]">{"\u20B9"}{s.price.toLocaleString("en-IN")}</p>
                        <p className={`text-[10px] font-medium ${s.changePercent >= 0 ? "text-up" : "text-down"}`}>
                          {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-[11px] text-white/25 tracking-[0.1em]">NO RESULTS FOUND</p>
                <p className="text-[10px] text-white/15 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-0">
                {caption && (
                  <p className="text-[10px] tracking-[0.15em] text-white/30 font-medium px-4 pt-4 pb-2">
                    {caption}
                  </p>
                )}
                {results.map((r) => (
                  <ResultRow key={resultKey(r)} result={r} onNavigate={onClose} />
                ))}
                <div className="px-5 py-3 text-center">
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
