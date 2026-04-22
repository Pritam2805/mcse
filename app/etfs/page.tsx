"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Layers, ChevronDown, PieChart, ArrowLeft } from "lucide-react";
import Sparkline from "@/components/Sparkline";
import { getEtfs, getEtf, getEtfHoldings, type ETFListItem, type ETFDetail, type ETFHolding } from "@/lib/api";
import { useMarketTick } from "@/lib/WebSocketContext";

// ─── NavChart ─────────────────────────────────────────────────────────────────

function NavChart({ history }: { history: ETFDetail["nav_history"] }) {
  if (!history || history.length < 2) return null;
  const navData   = history.map((h) => h.nav);
  const priceData = history.map((h) => h.market_price);
  const lastNav   = navData[navData.length - 1];
  const lastPrice = priceData[priceData.length - 1];

  return (
    <div className="mt-4">
      <div className="flex items-center gap-4 mb-2">
        <span className="text-[9px] tracking-[0.15em] text-white/40 flex items-center gap-1.5">
          <span className="inline-block w-5 h-px bg-white/40 align-middle" /> NAV
        </span>
        <span className={`text-[9px] tracking-[0.15em] flex items-center gap-1.5 ${lastPrice >= lastNav ? "text-[var(--color-up,#4ade80)]" : "text-[var(--color-down,#f87171)]"}`}>
          <span className="inline-block w-5 h-px bg-current align-middle" /> PRICE
        </span>
      </div>
      <div className="relative h-10">
        <div className="absolute inset-0">
          <Sparkline data={navData} width={280} height={40} color="rgba(255,255,255,0.35)" />
        </div>
        <div className="absolute inset-0">
          <Sparkline data={priceData} width={280} height={40} positive={lastPrice >= lastNav} />
        </div>
      </div>
    </div>
  );
}

// ─── ETF Card ─────────────────────────────────────────────────────────────────

function ETFCard({
  etf,
  idx,
  isOpen,
  onToggle,
}: {
  etf: ETFListItem;
  idx: number;
  isOpen: boolean;
  onToggle: (ticker: string) => void;
}) {
  const tick = useMarketTick(etf.ticker);
  const livePrice = tick?.price ?? etf.price;
  const liveNav   = tick?.bid   ?? etf.nav;   // bid carries NAV in ETF_NAV_UPDATE

  const premiumBps = liveNav > 0 ? Math.round((livePrice / liveNav - 1) * 10_000) : 0;
  const expPct     = (etf.expense_ratio_bps / 100).toFixed(2);
  const aum        = (livePrice * etf.shares_outstanding / 1e7).toFixed(0);

  const [holdings, setHoldings] = useState<ETFHolding[] | null>(null);
  const [detail, setDetail]     = useState<ETFDetail | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!holdings) {
      getEtfHoldings(etf.ticker).then((r) => { if (r.data) setHoldings(r.data); });
    }
    if (!detail) {
      getEtf(etf.ticker).then((r) => { if (r.data) setDetail(r.data); });
    }
  }, [isOpen, etf.ticker, holdings, detail]);

  return (
    <motion.div
      key={etf.ticker}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="border border-white/6 overflow-hidden"
    >
      <button
        onClick={() => onToggle(etf.ticker)}
        className="w-full p-5 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="font-[var(--font-anton)] text-[14px] tracking-[0.05em]">{etf.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] text-white/30">{etf.ticker}</span>
              <span className="text-[8px] tracking-[0.1em] text-white/20 px-1.5 py-0.5 border border-white/8">
                {etf.category}
              </span>
            </div>
          </div>
          <ChevronDown
            size={14}
            className={`text-white/25 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <p className="font-[var(--font-anton)] text-[16px]">₹{livePrice.toFixed(2)}</p>
            <p className={`text-[11px] font-medium ${premiumBps >= 0 ? "text-[var(--color-up,#4ade80)]" : "text-[var(--color-down,#f87171)]"}`}>
              {premiumBps >= 0 ? "+" : ""}{premiumBps} bps
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-[0.1em] text-white/25">NAV</p>
            <p className="text-[11px] text-white/50">₹{liveNav.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[1px] bg-white/8">
          <div className="bg-bg p-2.5 text-center">
            <p className="text-[8px] tracking-[0.15em] text-white/25 mb-0.5">EXP</p>
            <p className="text-[12px] text-white/50">{expPct}%</p>
          </div>
          <div className="bg-bg p-2.5 text-center">
            <p className="text-[8px] tracking-[0.15em] text-white/25 mb-0.5">AUM</p>
            <p className="text-[12px] text-white/50">₹{aum} Cr</p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/6 pt-4">
              {detail && <NavChart history={detail.nav_history} />}

              <div className="flex items-center gap-1.5 mt-4 mb-3">
                <PieChart size={11} className="text-white/25" />
                <p className="text-[9px] tracking-[0.15em] text-white/25">TOP HOLDINGS</p>
              </div>

              {holdings ? (
                <div className="space-y-1.5">
                  {holdings.slice(0, 8).map((h) => (
                    <div key={h.ticker} className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-white/6 overflow-hidden">
                        <div className="h-full bg-white/20" style={{ width: `${(h.weight * 100).toFixed(1)}%` }} />
                      </div>
                      <span className="text-[10px] text-white/50 w-20 truncate">{h.ticker}</span>
                      <span className="text-[10px] text-white/30 w-12 text-right">
                        {(h.weight * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {holdings.length > 8 && (
                    <p className="text-[9px] text-white/20 mt-1">+{holdings.length - 8} more</p>
                  )}
                </div>
              ) : (
                <div className="h-8 animate-pulse bg-white/4 rounded" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type CategoryFilter = "ALL" | "INDEX" | "SECTOR" | "THEMATIC" | "DIVIDEND" | "MULTI_ASSET";
const categories: CategoryFilter[] = ["ALL", "INDEX", "SECTOR", "THEMATIC", "MULTI_ASSET"];

export default function ETFsPage() {
  const [etfList, setEtfList]   = useState<ETFListItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const router = useRouter();

  useEffect(() => {
    getEtfs()
      .then((r) => { if (r.data) setEtfList(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    category === "ALL" ? etfList : etfList.filter((e) => e.category === category);

  const handleToggle = (ticker: string) =>
    setExpanded((prev) => (prev === ticker ? null : ticker));

  return (
    <div className="pb-24 md:pb-12 py-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 border border-white/20 flex items-center justify-center hover:border-white transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <Layers size={18} className="text-white/40" />
          <div>
            <h1 className="font-[var(--font-anton)] text-xl tracking-[0.1em] uppercase">ETFs</h1>
            <p className="text-[10px] tracking-[0.15em] text-white/30 mt-0.5">
              {loading ? "LOADING…" : `${filtered.length} FUNDS`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0 mb-6 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2.5 text-[10px] tracking-[0.15em] border-b-2 transition-all duration-300 whitespace-nowrap ${
              category === cat
                ? "text-white border-white"
                : "text-white/40 border-transparent hover:text-white/60"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 border border-white/6 animate-pulse bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((etf, idx) => (
            <ETFCard
              key={etf.ticker}
              etf={etf}
              idx={idx}
              isOpen={expanded === etf.ticker}
              onToggle={handleToggle}
            />
          ))}

          {filtered.length === 0 && (
            <div className="py-16 text-center col-span-2">
              <p className="text-[11px] tracking-[0.1em] text-white/20">No ETFs in this category</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
