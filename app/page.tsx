"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronRight, ChevronDown, ChevronUp, Target, Layers, ScanLine, Calendar, Landmark, Repeat, TrendingUp as TrendingUpIcon, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Sparkline from "@/components/Sparkline";
import { useAuth } from "@/lib/AuthContext";
import {
  indices,
  topGainers,
  topLosers,
  volumeShockers,
  productsAndTools,
  newsItems,
  formatRelativeTime,
  parentCompanies,
  stockDirectory,
  type MoverStock,
} from "@/lib/mockData";
import { getMarketStatus, type MarketStatus } from "@/lib/api";

const PHASE_LABEL: Record<MarketStatus["phase"], string> = {
  IDLE: "COMING SOON",
  PRE_MARKET: "IPO OPEN",
  ALLOTMENT_POSTED: "ALLOTMENT POSTED",
  DAY_1: "DAY 1 / 2",
  DAY_END_1: "DAY 1 CLOSED",
  DAY_2: "DAY 2 / 2",
  EVENT_END: "EVENT CLOSED",
  PAUSED: "PAUSED",
};

function PhaseBadge() {
  const [status, setStatus] = useState<MarketStatus | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await getMarketStatus();
      if (active && res.data) setStatus(res.data);
    };
    load();
    const id = setInterval(load, 15_000);
    return () => { active = false; clearInterval(id); };
  }, []);
  if (!status || status.phase === "IDLE") return null;
  const label = PHASE_LABEL[status.phase] ?? status.phase;
  const remaining = status.phaseEndsAt
    ? (() => {
        const diff = new Date(status.phaseEndsAt!).getTime() - Date.now();
        if (diff <= 0) return "";
        const h = Math.floor(diff / 3600000);
        const m = Math.floor(diff / 60000) % 60;
        return ` · ${h}:${m.toString().padStart(2, "0")} LEFT`;
      })()
    : "";
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/20 bg-white/[0.03]">
      <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? "bg-up animate-pulse" : "bg-white/30"}`} />
      <span className="text-[9px] tracking-[0.2em] text-white/80">{label}{remaining}</span>
    </div>
  );
}

const iconMap: Record<string, React.ElementType> = {
  target: Target, layers: Layers,
  scan: ScanLine, calendar: Calendar,
  landmark: Landmark, repeat: Repeat,
  "trending-up": TrendingUpIcon,
};

type MoverTab = "GAINERS" | "LOSERS" | "VOLUME";
type MoverSortKey = "ticker" | "price" | "dayChangePercent" | "volume";
type SortDir = "asc" | "desc";

const filteredProducts = productsAndTools.filter(
  (p) => !["BONDS", "STOCKS SIP", "MTF STOCKS"].includes(p.label)
);

const productRoutes: Record<string, string> = {
  "IPO": "/ipo",
  "ETFs": "/etfs",
  "INTRADAY SCREENER": "/screener",
  "EVENTS CALENDAR": "/events",
};

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<MoverTab>("GAINERS");
  const [moverSort, setMoverSort] = useState<MoverSortKey>("dayChangePercent");
  const [moverSortDir, setMoverSortDir] = useState<SortDir>("desc");
  const [moverSortOpen, setMoverSortOpen] = useState(false);
  const [moverMobileValue, setMoverMobileValue] = useState<"price" | "dayChangePercent" | "volume">("price");
  const { isLoggedIn } = useAuth();

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    // IPO (PRE_MARKET) opens 23 Apr 18:30 IST = 13:00 UTC
    const target = new Date("2026-04-23T13:00:00Z");
    function tick() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor(diff / 3600000) % 24,
        minutes: Math.floor(diff / 60000) % 60,
        seconds: Math.floor(diff / 1000) % 60,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const currentMovers = useMemo(() => {
    const moverData: Record<MoverTab, MoverStock[]> = {
      GAINERS: topGainers,
      LOSERS: topLosers,
      VOLUME: volumeShockers,
    };
    const arr = [...moverData[activeTab]];
    arr.sort((a, b) => {
      let av: string | number, bv: string | number;
      if (moverSort === "ticker") { av = a.ticker; bv = b.ticker; }
      else if (moverSort === "volume") {
        av = parseFloat(a.volume); bv = parseFloat(b.volume);
      }
      else { av = a[moverSort]; bv = b[moverSort]; }
      if (typeof av === "string") return moverSortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return moverSortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr.slice(0, 7);
  }, [activeTab, moverSort, moverSortDir]);

  function toggleMoverSort(key: MoverSortKey) {
    if (moverSort === key) setMoverSortDir(d => d === "asc" ? "desc" : "asc");
    else { setMoverSort(key); setMoverSortDir("desc"); }
  }

  function sortIcon(col: MoverSortKey) {
    return moverSort === col
      ? moverSortDir === "asc" ? <ChevronUp size={10} className="inline ml-0.5" /> : <ChevronDown size={10} className="inline ml-0.5" />
      : <ChevronDown size={10} className="inline ml-0.5 opacity-30" />;
  }

  return (
    <div className="py-6">
      {/* Marketing hero - non-logged-in users */}
      {!isLoggedIn && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="border border-emerald-500/20 mb-8 md:mb-10 relative overflow-hidden"
        >
          {/* Gradient wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-900/10 to-transparent pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 65% 90% at -5% -5%, rgba(0,210,106,0.18), transparent 65%)" }} />

          <div className="relative z-10">
            {/* Top bar - date + logos + live badge */}
            <div className="flex items-center justify-between px-8 md:px-12 pt-8 md:pt-10">
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <span className="text-[9px] tracking-[0.3em] text-white/30">
                  23 {"\u2014"} 26 APRIL {"\u00B7"} MAHINDRA UNIVERSITY
                </span>
                <PhaseBadge />
                <span className="hidden sm:flex items-center gap-2.5 ml-1">
                  <a href="https://www.mu-aeon.com" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity">
                    <Image src="/aeon.png" alt="AEON" width={22} height={22} className="object-contain" />
                  </a>
                  <a href="https://mathsoc.in" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity">
                    <Image src="/mathsoc.png" alt="MathSoc" width={22} height={22} className="object-contain" />
                  </a>
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex items-center gap-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full bg-up opacity-60" />
                  <span className="relative inline-flex h-2 w-2 bg-up" />
                </span>
                <span className="text-[8px] tracking-[0.2em] text-up/70 font-semibold">LIVE</span>
              </motion.div>
            </div>

            {/* Main grid */}
            <div className="grid lg:grid-cols-[3fr_2fr]">
              {/* Left: Copy */}
              <div className="px-8 md:px-12 pt-6 pb-8 md:pb-12">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="font-[MonumentExtended] font-extrabold text-2xl sm:text-3xl md:text-[3rem] leading-[1.05] tracking-tight uppercase mb-6"
                >
                  THE EXCHANGE<br />IS LIVE @{" "}
                  <a
                    href="https://www.mu-aeon.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#A855F7] transition-colors duration-300"
                  >
                    AEON &rsquo;26
                  </a>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="text-[12px] md:text-[13px] text-white/40 leading-relaxed max-w-md mb-6"
                >
                  University clubs, listed as equities. Buy shares, trade live across three evenings, and compete for a {""
                  }<span className="text-white/70 font-semibold">{"\u20B9"}70,000</span> prize pool.
                  Entry {"\u20B9"}100 {"-"} free for MU students.
                </motion.p>

                {/* Countdown */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-8"
                >
                  <p className="text-[8px] tracking-[0.25em] text-white/25 mb-2.5">IPO OPENS APR 23 &#183; 6:30 PM IST</p>
                  <div className="flex items-baseline gap-0">
                    {([
                      { label: "D", value: timeLeft.days },
                      { label: "H", value: timeLeft.hours },
                      { label: "M", value: timeLeft.minutes },
                      { label: "S", value: timeLeft.seconds },
                    ] as { label: string; value: number }[]).map(({ label, value }, i) => (
                      <span key={label} className="flex items-baseline">
                        {i > 0 && <span className="font-[MonumentExtended] text-xl md:text-2xl text-white/20 mx-1.5 leading-none" style={{ lineHeight: 1 }}>:</span>}
                        <span className="flex items-baseline gap-0.5">
                          <span className="font-[MonumentExtended] font-extrabold text-2xl md:text-3xl tabular-nums leading-none" style={{ lineHeight: 1 }}>
                            {String(value).padStart(2, "0")}
                          </span>
                          <span className="text-[7px] tracking-[0.1em] text-white/30 self-end mb-0.5">{label}</span>
                        </span>
                      </span>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-4"
                >
                  <a
                    href="https://www.mu-aeon.com/events?event=mcse"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 text-[10px] tracking-[0.15em] font-semibold bg-white text-black border border-white hover:bg-transparent hover:text-white transition-all duration-300"
                  >
                    REGISTER NOW
                  </a>
                  <Link
                    href="/login"
                    className="px-6 py-3 text-[10px] tracking-[0.15em] font-semibold bg-transparent text-white/50 border border-white/15 hover:text-white hover:border-white transition-all duration-300"
                  >
                    LOG IN
                  </Link>
                </motion.div>
              </div>

              {/* Right: Stats grid (desktop) */}
              <div className="hidden lg:grid grid-cols-2 border-l border-white/6">
                {[
                  { label: "SCHEDULE", value: "3 EVENINGS", sub: "8:30 PM onwards" },
                  { label: "ENTRY FEE", value: "\u20B9100", sub: "Free for MU" },
                  { label: "CLUBS LISTED", value: "30+", sub: "Across all schools" },
                  { label: "PRIZE POOL", value: "\u20B970,000", sub: "Top 3 portfolios" },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className={`flex flex-col justify-center px-8 py-7 ${i < 2 ? "border-b border-white/6" : ""} ${i % 2 === 0 ? "border-r border-white/6" : ""}`}
                  >
                    <span className="text-[8px] tracking-[0.2em] text-white/25 mb-1.5">{stat.label}</span>
                    <span className="font-[var(--font-anton)] text-xl tracking-tight">{stat.value}</span>
                    <span className="text-[9px] text-white/20 mt-1">{stat.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile stats strip */}
            <div className="lg:hidden grid grid-cols-4 border-t border-white/6">
              {[
                { label: "SCHEDULE", value: "3 EVES" },
                { label: "ENTRY", value: "\u20B9100" },
                { label: "LISTED", value: "30+" },
                { label: "PRIZE", value: "\u20B970K" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`text-center py-4 ${i < 3 ? "border-r border-white/6" : ""}`}
                >
                  <p className="text-[7px] tracking-[0.15em] text-white/25 mb-0.5">{stat.label}</p>
                  <p className="font-[var(--font-anton)] text-[13px] tracking-tight">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Products & Tools - full-width feature grid */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-8 md:mb-10"
      >
        <h2 className="font-[var(--font-anton)] text-base md:text-lg tracking-[0.1em] uppercase mb-5">
          PRODUCTS & TOOLS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-white/8">
          {filteredProducts.map((item) => {
            const Icon = iconMap[item.icon] || Target;
            const route = productRoutes[item.label] || "/";
            return (
              <div key={item.label}>
                <Link
                  href={route}
                  className="flex flex-col gap-2.5 bg-bg p-5 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors group h-full"
                >
                  <Icon size={18} strokeWidth={1.5} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  <div>
                    <p className="text-[10px] tracking-[0.12em] text-white/60 group-hover:text-white transition-colors font-medium">{item.label}</p>
                    <p className="text-[9px] text-white/20 mt-0.5 leading-relaxed hidden md:block">{item.description}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Desktop: 2-column grid (60% / 40%) */}
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
        {/* LEFT COLUMN */}
        <div className="min-w-0">
          {/* TOP MOVERS TODAY */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-9 md:mb-10"
          >
            <h2 className="font-[var(--font-anton)] text-base md:text-lg tracking-[0.1em] uppercase mb-5">
              TOP MOVERS TODAY
            </h2>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
                {(["GAINERS", "LOSERS", "VOLUME"] as MoverTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-[10px] tracking-[0.15em] border-b-2 transition-all duration-300 whitespace-nowrap ${
                      activeTab === tab
                        ? "text-white border-white"
                        : "text-white/40 border-transparent hover:text-white/60"
                    }`}
                  >
                    {tab === "VOLUME" ? "VOLUME SHOCKERS" : tab}
                  </button>
                ))}
              </div>
              <Link href="/markets" className="hidden lg:flex items-center gap-1 text-[9px] tracking-[0.12em] text-white/30 hover:text-white transition-colors shrink-0">
                SEE ALL <ChevronRight size={11} />
              </Link>
            </div>

            {/* Mobile: sort + card list */}
            <div className="lg:hidden">
              <div className="flex items-center gap-3 mb-3 relative">
                <button
                  onClick={() => setMoverSortOpen(!moverSortOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 text-[10px] tracking-[0.1em] text-white/60 hover:text-white hover:border-white transition-colors"
                >
                  <ArrowUpDown size={11} />
                  SORT
                </button>
                {moverSortOpen && (
                  <div className="absolute top-full left-0 mt-1 z-20 border border-white/15 bg-bg min-w-[140px]">
                    {(["ticker", "price", "dayChangePercent", "volume"] as MoverSortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => { setMoverSort(key); setMoverSortDir("desc"); setMoverSortOpen(false); }}
                        className={`block w-full text-left px-4 py-2.5 text-[10px] tracking-[0.1em] transition-colors ${moverSort === key ? "text-white bg-white/[0.06]" : "text-white/50 hover:text-white hover:bg-white/[0.03]"}`}
                      >
                        {{ ticker: "NAME", price: "PRICE", dayChangePercent: "CHANGE %", volume: "VOLUME" }[key]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[9px] tracking-[0.1em] text-white/25">
                    VALUE
                  </span>
                  <button
                    onClick={() => setMoverMobileValue((d) => {
                      const order: typeof d[] = ["price", "dayChangePercent", "volume"];
                      return order[(order.indexOf(d) + 1) % order.length];
                    })}
                    className="px-3 py-1.5 border border-white/15 text-[9px] tracking-[0.1em] text-white/60 hover:text-white hover:border-white transition-colors"
                  >
                    {{ price: "PRICE", dayChangePercent: "CHG%", volume: "VOL" }[moverMobileValue]}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
              {currentMovers.map((stock) => (
                <Link
                  key={stock.ticker}
                  href={`/stock/${stock.ticker}`}
                  className="flex items-center gap-4 bg-white/[0.02] border border-white/6 p-4 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{stock.ticker}</p>
                    <p className="text-[11px] text-white/40 truncate mt-0.5">{stock.name}</p>
                  </div>
                  <Sparkline data={stock.sparkline} width={52} height={22} positive={stock.dayChangePercent >= 0} />
                  <div className="text-right shrink-0 min-w-[70px]">
                    {moverMobileValue === "price" && (
                      <>
                        <p className="font-[var(--font-anton)] text-[13px]">{"\u20B9"}{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                        <p className={`text-[10px] font-medium ${stock.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>{stock.dayChangePercent >= 0 ? "+" : ""}{stock.dayChangePercent.toFixed(2)}%</p>
                      </>
                    )}
                    {moverMobileValue === "dayChangePercent" && (
                      <>
                        <p className={`font-[var(--font-anton)] text-[13px] ${stock.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>{stock.dayChangePercent >= 0 ? "+" : ""}{stock.dayChangePercent.toFixed(2)}%</p>
                        <p className="text-[10px] text-white/30">{"\u20B9"}{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                      </>
                    )}
                    {moverMobileValue === "volume" && (
                      <>
                        <p className="text-[12px] text-white/50">{stock.volume}</p>
                        <p className={`text-[10px] font-medium ${stock.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>{stock.dayChangePercent >= 0 ? "+" : ""}{stock.dayChangePercent.toFixed(2)}%</p>
                      </>
                    )}
                  </div>
                </Link>
              ))}
              </div>
              <Link href="/markets" className="flex items-center justify-center gap-1 mt-3 py-2.5 text-[9px] tracking-[0.12em] text-white/30 hover:text-white transition-colors border border-white/6">
                SEE ALL <ChevronRight size={11} />
              </Link>
            </div>

            {/* Desktop table with sortable headers */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-2 border-b border-white/12">
                <button onClick={() => toggleMoverSort("ticker")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-left hover:text-white transition-colors">
                  COMPANY {sortIcon("ticker")}
                </button>
                <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right">TREND</span>
                <button onClick={() => toggleMoverSort("price")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right hover:text-white transition-colors">
                  MKT PRICE {sortIcon("price")}
                </button>
                <button onClick={() => toggleMoverSort("volume")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right hover:text-white transition-colors">
                  VOLUME {sortIcon("volume")}
                </button>
              </div>
              {currentMovers.map((stock) => (
                <Link
                  key={stock.ticker}
                  href={`/stock/${stock.ticker}`}
                  className="grid grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-3 border-b border-white/6 hover:bg-white/[0.04] transition-colors duration-300 items-center"
                >
                  <div>
                    <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{stock.ticker}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{stock.name}</p>
                  </div>
                  <div className="flex justify-end">
                    <Sparkline data={stock.sparkline} width={80} height={24} positive={stock.dayChangePercent >= 0} />
                  </div>
                  <div className="text-right">
                    <p className="font-[var(--font-anton)] text-[13px]">
                      {"\u20B9"}{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[10px] font-medium ${stock.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>
                      {stock.dayChangePercent >= 0 ? "+" : ""}{stock.dayChangePercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-white/40">{stock.volume}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* MARKET INDICES */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-8 md:mb-10"
          >
            <Link href="/markets" className="flex items-center justify-between mb-5 group">
              <h2 className="font-[var(--font-anton)] text-base md:text-lg tracking-[0.1em] uppercase">
                MARKET INDICES
              </h2>
              <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </Link>
            <div className="grid grid-cols-2 gap-[1px] bg-white/8">
              {indices.slice(0, 4).map((idx) => (
                <div
                  key={idx.name}
                  className="bg-bg p-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] tracking-[0.1em] text-white/50">{idx.name}</p>
                    <Sparkline data={idx.sparkline} width={40} height={14} positive={idx.changePercent >= 0} />
                  </div>
                  <p className="font-[var(--font-anton)] text-[15px] tracking-tight mb-0.5">
                    {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-[10px] font-medium ${idx.changePercent >= 0 ? "text-up" : "text-down"}`}>
                    {idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)} ({idx.changePercent >= 0 ? "+" : ""}{idx.changePercent.toFixed(2)}%)
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* HOLDING COMPANIES */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-9 md:mb-10"
          >
            <Link href="/companies" className="flex items-center justify-between mb-5 group">
              <h2 className="font-[var(--font-anton)] text-base md:text-lg tracking-[0.1em] uppercase">
                HOLDING COMPANIES
              </h2>
              <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </Link>
            <div className="space-y-[1px] bg-white/8">
              {parentCompanies.slice(0, 4).map((pc) => {
                const subs = pc.subsidiaries.map(t => stockDirectory[t]).filter(Boolean);
                const avgChange = subs.length > 0 ? subs.reduce((s, sub) => s + sub.changePercent, 0) / subs.length : 0;
                return (
                  <Link
                    key={pc.ticker}
                    href={`/company/${pc.ticker}`}
                    className="flex items-center gap-4 bg-bg p-4 md:p-5 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="w-10 h-10 border border-white/20 flex items-center justify-center shrink-0 group-hover:border-white/40 transition-colors">
                      <span className="font-[var(--font-anton)] text-base text-white/60">{pc.logoLetter}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em] group-hover:text-white transition-colors">{pc.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {subs.map(sub => (
                          <span key={sub.ticker} className="text-[9px] tracking-[0.08em] text-white/25">{sub.ticker}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[12px] font-medium ${avgChange >= 0 ? "text-up" : "text-down"}`}>
                        {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}%
                      </p>
                      <p className="text-[9px] text-white/20 mt-0.5">{subs.length} subs</p>
                    </div>
                    <ChevronRight size={12} className="text-white/15 group-hover:text-white/40 transition-colors shrink-0 hidden md:block" />
                  </Link>
                );
              })}
            </div>
            <Link href="/companies" className="flex items-center justify-center gap-1 mt-2 py-2.5 text-[9px] tracking-[0.12em] text-white/30 hover:text-white transition-colors border border-white/6">
              SEE ALL {parentCompanies.length} COMPANIES <ChevronRight size={11} />
            </Link>
          </motion.div>

          {/* STOCKS IN NEWS TODAY (mobile, below movers) */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:hidden mt-6 mb-8"
          >
            <Link href="/news" className="flex items-center justify-between mb-5 group">
              <h2 className="font-[var(--font-anton)] text-base tracking-[0.1em] uppercase">
                STOCKS IN NEWS
              </h2>
              <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
            </Link>
            <div className="space-y-3">
              {newsItems.slice(0, 3).map((news, i) => (
                <Link
                  key={`${news.ticker}-${i}`}
                  href={`/stock/${news.ticker}`}
                  className="block border border-white/8 p-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-[var(--font-anton)] text-[12px] tracking-[0.05em]">{news.name}</p>
                    <p className={`text-[11px] font-medium ${news.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>
                      {news.dayChangePercent >= 0 ? "+" : ""}{news.dayChangePercent.toFixed(2)}%
                    </p>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2 mb-1">{news.headline}</p>
                  <p className="text-[9px] text-white/20">{formatRelativeTime(news.timestamp)}</p>
                </Link>
              ))}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN (desktop only) */}
        <aside className="hidden lg:block border-l border-white/8 pl-8 min-w-0">
          {/* Latest News */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-8"
          >
            <Link href="/news" className="flex items-center justify-between mb-4 group">
              <h3 className="font-[var(--font-anton)] text-sm tracking-[0.12em] uppercase text-white/50">
                LATEST NEWS
              </h3>
              <ChevronRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </Link>
            <div className="space-y-3">
              {newsItems.slice(0, 4).map((news, i) => (
                <Link
                  key={`${news.ticker}-${i}`}
                  href={`/stock/${news.ticker}`}
                  className="block border border-white/8 p-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-[var(--font-anton)] text-[11px] tracking-[0.05em]">{news.ticker}</span>
                    <span className={`text-[10px] font-medium ${news.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>
                      {news.dayChangePercent >= 0 ? "+" : ""}{news.dayChangePercent.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2 mb-1">{news.headline}</p>
                  <p className="text-[9px] text-white/20">{formatRelativeTime(news.timestamp)}</p>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-8"
          >
            <Link href="/events" className="flex items-center justify-between mb-4 group">
              <h3 className="font-[var(--font-anton)] text-sm tracking-[0.12em] uppercase text-white/50">
                UPCOMING EVENTS
              </h3>
              <ChevronRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </Link>
            <div className="space-y-2">
              {[
                { day: 24, month: "APR", title: "MATHSOC ANNUAL MEET", ticker: "MATHSOC", type: "AGM" },
                { day: 25, month: "APR", title: "ENIGMA Q2 Results", ticker: "ENIGMA", type: "RESULTS" },
                { day: 26, month: "APR", title: "GASMONKEYS Racing", ticker: "GASMONKEYS", type: "EVENT" },
              ].map((ev, i) => (
                <Link
                  key={i}
                  href={`/stock/${ev.ticker}`}
                  className="flex items-center gap-3 border border-white/6 p-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="w-10 text-center shrink-0">
                    <p className="text-[8px] tracking-[0.12em] text-white/25">{ev.month}</p>
                    <p className="font-[var(--font-anton)] text-base">{ev.day}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/60 truncate">{ev.title}</p>
                    <p className="text-[9px] text-white/25">{ev.ticker}</p>
                  </div>
                  <span className="text-[8px] tracking-[0.1em] text-white/25 shrink-0">{ev.type}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
