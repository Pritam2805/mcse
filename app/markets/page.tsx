"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronDown, ChevronUp, Activity, ArrowUpDown } from "lucide-react";
import Sparkline from "@/components/Sparkline";
import { indices } from "@/lib/mockData";
import { getMarketBreadth, getScreener, type MarketBreadth, type ScreenerItem } from "@/lib/api";

type SortKey = "ticker" | "price" | "change_pct" | "pe_ratio" | "volume" | "sector";
type SortDir = "asc" | "desc";

type MobileValueKey = "price" | "change_pct" | "volume" | "pe_ratio";
const mobileValueLabels: Record<MobileValueKey, string> = {
  price: "PRICE",
  change_pct: "CHG%",
  volume: "VOL",
  pe_ratio: "P/E",
};

const defaultBreadth: MarketBreadth = { advances: 0, declines: 0, unchanged: 0 };

export default function MarketsPage() {
  const [sectorFilter, setSectorFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("change_pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [mobileSort, setMobileSort] = useState<SortKey>("change_pct");
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileValue, setMobileValue] = useState<MobileValueKey>("change_pct");
  const [marketBreadth, setMarketBreadth] = useState<MarketBreadth>(defaultBreadth);
  const [stocks, setStocks] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketBreadth().then(res => {
      if (res.data) setMarketBreadth(res.data);
    });
    getScreener().then(res => {
      if (res.data) setStocks(res.data);
      setLoading(false);
    });
  }, []);

  const sectors = useMemo(() => {
    const s = new Set(stocks.map(st => st.sector));
    return ["ALL", ...Array.from(s).sort()];
  }, [stocks]);

  const totalBreadth = marketBreadth.advances + marketBreadth.declines + marketBreadth.unchanged;
  const advPct = totalBreadth > 0 ? ((marketBreadth.advances / totalBreadth) * 100).toFixed(1) : "0.0";
  const decPct = totalBreadth > 0 ? ((marketBreadth.declines / totalBreadth) * 100).toFixed(1) : "0.0";
  const unchPct = totalBreadth > 0 ? ((marketBreadth.unchanged / totalBreadth) * 100).toFixed(1) : "0.0";

  function sortList(list: ScreenerItem[], key: SortKey, dir: SortDir): ScreenerItem[] {
    return [...list].sort((a, b) => {
      if (key === "ticker") {
        return dir === "asc" ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      }
      if (key === "sector") {
        return dir === "asc" ? a.sector.localeCompare(b.sector) : b.sector.localeCompare(a.sector);
      }
      const av = (a[key] as number | null) ?? -Infinity;
      const bv = (b[key] as number | null) ?? -Infinity;
      return dir === "asc" ? av - bv : bv - av;
    });
  }

  const filtered = useMemo(() => {
    const list = sectorFilter === "ALL" ? stocks : stocks.filter(s => s.sector === sectorFilter);
    return sortList(list, sortKey, sortDir);
  }, [stocks, sectorFilter, sortKey, sortDir]);

  const mobileFiltered = useMemo(() => {
    const list = sectorFilter === "ALL" ? stocks : stocks.filter(s => s.sector === sectorFilter);
    return sortList(list, mobileSort, "desc");
  }, [stocks, sectorFilter, mobileSort]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function sortIcon(col: SortKey) {
    return sortKey === col
      ? sortDir === "asc" ? <ChevronUp size={10} className="inline ml-0.5" /> : <ChevronDown size={10} className="inline ml-0.5" />
      : <ChevronDown size={10} className="inline ml-0.5 opacity-30" />;
  }

  function formatMobileValue(stock: ScreenerItem) {
    switch (mobileValue) {
      case "price":
        return <span className="font-[var(--font-anton)] text-[13px]">
          {stock.price !== null ? `₹${stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
        </span>;
      case "change_pct":
        return <span className={`text-[12px] font-medium ${stock.change_pct === null ? "text-white/30" : stock.change_pct >= 0 ? "text-up" : "text-down"}`}>
          {stock.change_pct !== null ? `${stock.change_pct >= 0 ? "+" : ""}${stock.change_pct.toFixed(2)}%` : "—"}
        </span>;
      case "volume":
        return <span className="text-[12px] text-white/50">
          {stock.volume !== null ? `${(stock.volume / 1_000).toFixed(0)}K` : "—"}
        </span>;
      case "pe_ratio":
        return <span className="text-[12px] text-white/50">
          {stock.pe_ratio !== null ? stock.pe_ratio.toFixed(1) : "—"}
        </span>;
    }
  }

  return (
    <div className="py-6 md:py-8 md:pb-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-[var(--font-anton)] text-xl md:text-2xl tracking-[0.1em] uppercase">MARKETS</h1>
          <p className="text-[10px] tracking-[0.15em] text-white/30 mt-1">{stocks.length} STOCKS</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-up animate-pulse" />
          <span className="text-[9px] tracking-[0.12em] text-white/30">MARKET OPEN</span>
        </div>
      </div>

      {/* Indices tiles (simulation constructs — static) */}
      <section className="mb-8">
        <div className="grid gap-[1px] bg-white/8 grid-cols-2 md:grid-cols-4">
          {indices.map((idx, i) => (
            <Link key={idx.name} href={`/index/${idx.slug}`}>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-bg p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[8px] tracking-[0.15em] text-white/30 uppercase">{idx.name}</p>
                  <Sparkline data={idx.sparkline} width={36} height={12} positive={idx.changePercent >= 0} />
                </div>
                <p className="font-[var(--font-anton)] text-[15px] tracking-tight mb-0.5">
                  {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className={`text-[10px] font-medium ${idx.changePercent >= 0 ? "text-up" : "text-down"}`}>
                  {idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)} ({idx.changePercent >= 0 ? "+" : ""}{idx.changePercent.toFixed(2)}%)
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Market Breadth */}
      {totalBreadth > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity size={13} className="text-white/30" />
            <h2 className="text-[9px] tracking-[0.2em] text-white/30 uppercase">MARKET BREADTH</h2>
          </div>
          <div className="flex h-2 w-full overflow-hidden">
            <div className="bg-up transition-all" style={{ width: `${advPct}%` }} />
            <div className="bg-white/15 transition-all" style={{ width: `${unchPct}%` }} />
            <div className="bg-down transition-all" style={{ width: `${decPct}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-up">{marketBreadth.advances} advances ({advPct}%)</span>
            <span className="text-[9px] text-white/25">{marketBreadth.unchanged} unchanged</span>
            <span className="text-[9px] text-down">{marketBreadth.declines} declines ({decPct}%)</span>
          </div>
        </motion.section>
      )}

      {/* Sector filter tabs */}
      <div className="flex items-center gap-0 mb-6 border-b border-white/8 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {sectors.map(s => (
          <button
            key={s}
            onClick={() => setSectorFilter(s)}
            className={`px-4 py-3 text-[10px] tracking-[0.12em] border-b-2 transition-colors whitespace-nowrap ${
              sectorFilter === s ? "border-white text-white" : "border-transparent text-white/30 hover:text-white/60"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[11px] text-white/25 animate-pulse tracking-[0.1em] py-8">LOADING STOCKS...</p>
      ) : (
        <>
          {/* Desktop: full sortable table */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-[2fr_110px_110px_80px_70px_70px_80px] gap-3 px-4 py-2 border-b border-white/12">
              <button onClick={() => toggleSort("ticker")} className="text-[8px] tracking-[0.15em] text-white/30 uppercase text-left hover:text-white transition-colors">
                COMPANY {sortIcon("ticker")}
              </button>
              <button onClick={() => toggleSort("price")} className="text-[8px] tracking-[0.15em] text-white/30 uppercase text-right hover:text-white transition-colors">
                PRICE {sortIcon("price")}
              </button>
              <button onClick={() => toggleSort("change_pct")} className="text-[8px] tracking-[0.15em] text-white/30 uppercase text-right hover:text-white transition-colors">
                CHG% {sortIcon("change_pct")}
              </button>
              <button onClick={() => toggleSort("volume")} className="text-[8px] tracking-[0.15em] text-white/30 uppercase text-right hover:text-white transition-colors">
                VOL {sortIcon("volume")}
              </button>
              <button onClick={() => toggleSort("pe_ratio")} className="text-[8px] tracking-[0.15em] text-white/30 uppercase text-right hover:text-white transition-colors">
                P/E {sortIcon("pe_ratio")}
              </button>
              <button onClick={() => toggleSort("sector")} className="text-[8px] tracking-[0.15em] text-white/30 uppercase text-right hover:text-white transition-colors">
                SECTOR {sortIcon("sector")}
              </button>
              <span />
            </div>

            {filtered.map((stock, i) => (
              <motion.div
                key={stock.ticker}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Link
                  href={`/stock/${stock.ticker}`}
                  className="grid grid-cols-[2fr_110px_110px_80px_70px_70px_80px] gap-3 items-center px-4 py-3 border-b border-white/6 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-[var(--font-anton)] text-[12px] tracking-[0.05em]">{stock.ticker}</p>
                    <p className="text-[9px] text-white/30 truncate">{stock.name}</p>
                  </div>
                  <p className="font-[var(--font-anton)] text-[12px] text-right">
                    {stock.price !== null ? `₹${stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                  </p>
                  <p className={`text-[10px] font-medium text-right ${
                    stock.change_pct === null ? "text-white/30" : stock.change_pct >= 0 ? "text-up" : "text-down"
                  }`}>
                    {stock.change_pct !== null ? `${stock.change_pct >= 0 ? "+" : ""}${stock.change_pct.toFixed(2)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-white/40 text-right">
                    {stock.volume !== null ? `${(stock.volume / 1_000).toFixed(0)}K` : "—"}
                  </p>
                  <p className="text-[10px] text-white/40 text-right">
                    {stock.pe_ratio !== null ? stock.pe_ratio.toFixed(1) : "—"}
                  </p>
                  <p className="text-[9px] text-white/25 text-right">{stock.sector}</p>
                  <span />
                </Link>
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <p className="text-[11px] text-white/25 py-16 text-center tracking-[0.1em]">NO STOCKS IN THIS SECTOR</p>
            )}
          </div>

          {/* Mobile: card view */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4 relative">
              <button
                onClick={() => setMobileSortOpen(!mobileSortOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 text-[10px] tracking-[0.1em] text-white/60 hover:text-white hover:border-white transition-colors"
              >
                <ArrowUpDown size={11} />
                SORT
              </button>
              {mobileSortOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 border border-white/15 bg-bg min-w-[140px]">
                  {(["ticker", "price", "change_pct", "volume", "pe_ratio"] as SortKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => { setMobileSort(key); setMobileSortOpen(false); }}
                      className={`block w-full text-left px-4 py-2.5 text-[10px] tracking-[0.1em] transition-colors ${
                        mobileSort === key ? "text-white bg-white/[0.06]" : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      {{ ticker: "NAME", price: "PRICE", change_pct: "CHANGE %", volume: "VOLUME", pe_ratio: "P/E", sector: "SECTOR" }[key]}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-0">
                {(Object.keys(mobileValueLabels) as MobileValueKey[]).map(key => (
                  <button
                    key={key}
                    onClick={() => setMobileValue(key)}
                    className={`px-2.5 py-1 text-[9px] tracking-[0.1em] transition-colors ${mobileValue === key ? "text-white" : "text-white/30"}`}
                  >
                    {mobileValueLabels[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {mobileFiltered.map(stock => (
                <Link
                  key={stock.ticker}
                  href={`/stock/${stock.ticker}`}
                  className="flex items-center gap-4 bg-white/[0.02] border border-white/6 p-4 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{stock.ticker}</p>
                    <p className="text-[10px] text-white/40 truncate mt-0.5">{stock.name}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">{stock.sector}</p>
                  </div>
                  <div className="text-right shrink-0 min-w-[70px]">
                    {formatMobileValue(stock)}
                  </div>
                </Link>
              ))}
            </div>

            {mobileFiltered.length === 0 && (
              <p className="text-[11px] text-white/25 py-16 text-center tracking-[0.1em]">NO STOCKS IN THIS SECTOR</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
