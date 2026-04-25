"use client";

import { useState, use, useMemo, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { indexDirectory, stockDirectory, formatRelativeTime } from "@/lib/mockData";
import Sparkline from "@/components/Sparkline";

interface LiveNewsItem {
  id: string;
  headline: string;
  body: string;
  related_tickers: string[];
  sentiment: number;
  published_at: string | null;
  // Back-compat with mockData shape consumed lower in this file:
  ticker: string;
  name: string;
  timestamp: number;
}

const timeRanges = ["1H", "3H", "1D", "3D", "ALL"] as const;

export default function IndexDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();
  const idx = indexDirectory[name];
  const [range, setRange] = useState<string>("1D");
  const [chartType, setChartType] = useState<"LINE" | "CANDLE">("LINE");
  const [sectionTab, setSectionTab] = useState<"OVERVIEW" | "CONSTITUENTS" | "NEWS" | "EVENTS" | "FUNDAMENTALS">("OVERVIEW");
  // news navigates to /news/[id] page

  const candleData = useMemo(() => {
    if (!idx) return [];
    const cd = idx.chartData[range] || idx.chartData["1D"];
    const vals = cd.map((d) => d.price);
    const n = vals.length;
    if (n < 2) return [];
    const candles: { open: number; close: number; high: number; low: number }[] = [];
    for (let i = 1; i < n; i++) {
      const open = vals[i - 1];
      const close = vals[i];
      const spread = 0.001 + (((i * 7 + 3) % 11) / 11) * 0.002;
      const high = Math.max(open, close) * (1 + spread);
      const low = Math.min(open, close) * (1 - spread);
      candles.push({ open, close, high, low });
    }
    return candles;
  }, [idx, range]);

  const constituents = useMemo(() => {
    if (!idx) return [];
    return idx.constituents.map((t) => stockDirectory[t]).filter(Boolean);
  }, [idx]);

  // Fetch live news from the API and filter to this index's constituents.
  const [liveNews, setLiveNews] = useState<LiveNewsItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/market/news?limit=80");
        if (!res.ok) return;
        const raw = (await res.json()) as Array<{
          id: string; headline: string; body: string;
          related_tickers: string[]; sentiment: number;
          published_at: string | null;
        }>;
        if (cancelled) return;
        setLiveNews(raw.map((n) => ({
          ...n,
          // Provide legacy mock-shape fields used by the existing JSX below.
          ticker: n.related_tickers[0] ?? "",
          name: (n.related_tickers[0] && stockDirectory[n.related_tickers[0]]?.name) ?? "",
          timestamp: n.published_at ? new Date(n.published_at).getTime() : Date.now(),
        })));
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const indexNews = useMemo(() => {
    if (!idx) return [];
    return liveNews.filter((n) =>
      n.related_tickers.some((t) => idx.constituents.includes(t)),
    );
  }, [idx, liveNews]);

  const indexEvents = useMemo(() => {
    if (!idx) return [];
    const events: { ticker: string; title: string; date: string; type: string }[] = [];
    for (const t of idx.constituents) {
      const stock = stockDirectory[t];
      if (stock?.events) {
        for (const e of stock.events) {
          events.push({ ticker: t, ...e });
        }
      }
    }
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [idx]);

  const fundamentals = useMemo(() => {
    if (!idx) return null;
    const stocks = constituents;
    if (stocks.length === 0) return null;

    const sectors: Record<string, number> = {};
    let totalMarketCapCr = 0;
    let peSum = 0;
    let peCount = 0;
    let totalVolume = 0;

    for (const s of stocks) {
      const f = s.fundamentals;
      const capStr = f.marketCap.replace("Cr", "");
      totalMarketCapCr += parseFloat(capStr);
      if (f.pe > 0) { peSum += f.pe; peCount++; }
      totalVolume += parseFloat(f.volume) * 1_000_000;
      sectors[f.sector] = (sectors[f.sector] || 0) + 1;
    }

    return {
      totalMarketCap: `${totalMarketCapCr.toFixed(1)}Cr`,
      avgPE: peCount > 0 ? (peSum / peCount).toFixed(1) : "—",
      totalVolume: `${(totalVolume / 1_000_000).toFixed(1)}M`,
      sectors: Object.entries(sectors).sort((a, b) => b[1] - a[1]),
      stockCount: stocks.length,
    };
  }, [idx, constituents]);

  if (!idx) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-[var(--font-anton)] text-2xl tracking-[0.1em] uppercase mb-2"
        >
          INDEX NOT FOUND
        </motion.h1>
        <p className="text-[11px] text-white/40 mb-4">{name}</p>
        <Link
          href="/"
          className="px-6 py-3 text-[10px] tracking-[0.15em] bg-white text-black font-semibold hover:bg-transparent hover:text-white border border-white transition-all duration-150"
        >
          BACK TO EXPLORE
        </Link>
      </div>
    );
  }

  const chartData = idx.chartData[range] || idx.chartData["1D"];
  const chartValues = chartData.map((d) => d.price);

  const sorted = [...constituents].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.filter((s) => s.changePercent > 0).slice(0, 5);
  const losers = sorted.filter((s) => s.changePercent < 0).slice(-5).reverse();

  const visibleTabs = (["OVERVIEW", "CONSTITUENTS", "NEWS", "EVENTS", "FUNDAMENTALS"] as const).filter((tab) => {
    if (tab === "NEWS") return indexNews.length > 0;
    if (tab === "EVENTS") return indexEvents.length > 0;
    return true;
  });

  const typeColors: Record<string, string> = {
    RESULTS: "text-[#00D26A] border-[#00D26A]/30 bg-[#00D26A]/5",
    AGM: "text-blue-400 border-blue-400/30 bg-blue-400/5",
    DIVIDEND: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    EVENT: "text-white/50 border-white/20 bg-white/5",
  };

  return (
    <div className="mobile-content-pad">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 py-4 border-b border-white/8">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-11 h-11 border border-white/20 flex items-center justify-center hover:border-white active:bg-white/[0.04] transition-colors duration-150"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <span className="font-[var(--font-anton)] text-base md:text-lg tracking-[0.05em]">{idx.name}</span>
            <p className="text-[10px] text-white/40">Market Index</p>
          </div>
        </div>
      </div>

      {/* Desktop: 2-column grid */}
      <div className="lg:grid lg:grid-cols-[7fr_3fr] lg:gap-0 py-6">
        {/* Main content */}
        <div className="min-w-0 lg:pr-6">
          {/* Price */}
          <div className="mb-7 md:mb-8">
            <p className="font-[var(--font-anton)] text-3xl md:text-4xl tracking-tight mb-1.5">
              {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-3">
              <p className={`text-[12px] font-medium ${idx.changePercent >= 0 ? "text-[#00D26A]" : "text-[#FF5252]"}`}>
                {idx.changePercent >= 0 ? "+" : ""}{idx.change.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                {" "}({idx.changePercent >= 0 ? "+" : ""}{idx.changePercent.toFixed(2)}%) {"\u00B7"} {range}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="mb-5 md:mb-6 md:border md:border-white/8 -mx-4 px-4 md:mx-0 md:p-6 py-4">
            <div className="w-full overflow-hidden">
              {chartType === "LINE" ? (
                <Sparkline
                  data={chartValues}
                  width={960}
                  height={280}
                  strokeWidth={1.5}
                  positive={idx.changePercent >= 0}
                  interactive
                  labels={chartData.map((d) => d.day)}
                  baseline={["1H", "3H", "1D"].includes(range) ? chartValues[0] : undefined}
                />
              ) : (
                <svg viewBox="0 0 960 280" width={960} height={280} className="block overflow-visible" style={{ maxWidth: '100%', height: 'auto' }}>
                  {(() => {
                    if (candleData.length === 0) return null;
                    const allMin = Math.min(...chartValues);
                    const allMax = Math.max(...chartValues);
                    const priceRange = allMax - allMin || 1;
                    const pad = 2;
                    const barW = (960 - pad * 2) / candleData.length;
                    const toY = (v: number) => 280 - pad - ((v - allMin) / priceRange) * (280 - pad * 2);
                    return candleData.map((c, i) => {
                      const x = pad + i * barW + barW / 2;
                      const bullish = c.close >= c.open;
                      const color = bullish ? "var(--color-up)" : "var(--color-down)";
                      const bodyTop = toY(Math.max(c.open, c.close));
                      const bodyBot = toY(Math.min(c.open, c.close));
                      const bodyH = Math.max(bodyBot - bodyTop, 1);
                      const w = barW * 0.6;
                      return (
                        <g key={i}>
                          <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={color} strokeWidth={1} />
                          <rect x={x - w / 2} y={bodyTop} width={w} height={bodyH} fill={bullish ? color : color} stroke={color} strokeWidth={0.5} fillOpacity={bullish ? 0.3 : 0.8} />
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}
            </div>
            {/* Time range toggles */}
            <div className="flex items-center gap-0 mt-4">
              <div className="flex items-center gap-0 flex-1">
                {timeRanges.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-4 h-9 text-[10px] tracking-[0.15em] border-b-2 transition-all duration-150 ${
                      range === r
                        ? "text-white border-white"
                        : "text-white/40 border-transparent hover:text-white/60"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0 shrink-0">
                {(["LINE", "CANDLE"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`px-3 h-9 text-[9px] tracking-[0.12em] border-b-2 transition-all duration-150 ${
                      chartType === t
                        ? "text-white border-white"
                        : "text-white/25 border-transparent hover:text-white/50"
                    }`}
                  >
                    {t === "LINE" ? "LINE" : "OHLC"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-0 mb-6 md:mb-8 border-b border-white/8 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSectionTab(tab)}
                className={`px-5 py-3 text-[10px] tracking-[0.15em] font-medium border-b-2 transition-all duration-150 whitespace-nowrap ${
                  sectionTab === tab
                    ? "text-white border-white"
                    : "text-white/35 border-transparent hover:text-white/60"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* OVERVIEW tab */}
          {sectionTab === "OVERVIEW" && (
            <>
              {/* About */}
              <div className="mb-7 md:mb-8">
                <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">ABOUT {idx.name}</h3>
                <div className="border border-white/8 p-5">
                  <p className="text-[12px] md:text-[13px] text-white/50 leading-relaxed">{idx.description}</p>
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/6">
                    <span className="text-[9px] tracking-[0.15em] text-white/25">STOCKS</span>
                    <span className="text-[10px] text-white/50">{constituents.length} constituents</span>
                  </div>
                </div>
              </div>

              {/* Overview Stats */}
              <div className="mb-7 md:mb-8">
                <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">OVERVIEW</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-white/8">
                  {[
                    { label: "VALUE", val: idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) },
                    { label: "CHANGE", val: `${idx.change >= 0 ? "+" : ""}${idx.change.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
                    { label: "CHANGE %", val: `${idx.changePercent >= 0 ? "+" : ""}${idx.changePercent.toFixed(2)}%` },
                    { label: "STOCKS", val: String(constituents.length) },
                  ].map((item) => (
                    <div key={item.label} className="bg-bg p-4 md:p-5">
                      <p className="text-[9px] tracking-[0.2em] text-white/25 uppercase mb-1.5">{item.label}</p>
                      <p className="font-[var(--font-anton)] text-lg md:text-xl">{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Gainers */}
              {gainers.length > 0 && (
                <div className="mb-7 md:mb-8">
                  <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4 text-[#00D26A]/80">TOP GAINERS</h3>
                  <div className="space-y-0">
                    {gainers.map((s) => (
                      <Link
                        key={s.ticker}
                        href={`/stock/${s.ticker}`}
                        className="flex items-center justify-between py-3 border-b border-white/6 last:border-0 hover:bg-white/[0.02] transition-colors -mx-1 px-1"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 border border-[#00D26A]/20 flex items-center justify-center text-[10px] font-[var(--font-anton)] tracking-wider text-[#00D26A]/60 shrink-0">
                            {s.ticker.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium truncate">{s.ticker}</p>
                            <p className="text-[9px] text-white/40 truncate">{s.name}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-[11px] font-[var(--font-anton)] tracking-wide">{"\u20B9"}{s.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                          <p className="text-[9px] font-medium text-[#00D26A]">+{s.changePercent.toFixed(2)}%</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Losers */}
              {losers.length > 0 && (
                <div className="mb-7 md:mb-8">
                  <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4 text-[#FF5252]/80">TOP LOSERS</h3>
                  <div className="space-y-0">
                    {losers.map((s) => (
                      <Link
                        key={s.ticker}
                        href={`/stock/${s.ticker}`}
                        className="flex items-center justify-between py-3 border-b border-white/6 last:border-0 hover:bg-white/[0.02] transition-colors -mx-1 px-1"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 border border-[#FF5252]/20 flex items-center justify-center text-[10px] font-[var(--font-anton)] tracking-wider text-[#FF5252]/60 shrink-0">
                            {s.ticker.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium truncate">{s.ticker}</p>
                            <p className="text-[9px] text-white/40 truncate">{s.name}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-[11px] font-[var(--font-anton)] tracking-wide">{"\u20B9"}{s.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                          <p className="text-[9px] font-medium text-[#FF5252]">{s.changePercent.toFixed(2)}%</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* CONSTITUENTS tab */}
          {sectionTab === "CONSTITUENTS" && (
            <div>
              <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">CONSTITUENTS ({constituents.length})</h3>
              <div className="space-y-0">
                {constituents.map((s) => (
                  <Link
                    key={s.ticker}
                    href={`/stock/${s.ticker}`}
                    className="flex items-center justify-between py-3 border-b border-white/6 last:border-0 hover:bg-white/[0.02] transition-colors -mx-1 px-1"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 border border-white/15 flex items-center justify-center text-[10px] font-[var(--font-anton)] tracking-wider text-white/60 shrink-0">
                        {s.ticker.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate">{s.ticker}</p>
                        <p className="text-[9px] text-white/40 truncate">{s.name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-[11px] font-[var(--font-anton)] tracking-wide">
                        {"\u20B9"}{s.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-[9px] font-medium ${s.changePercent >= 0 ? "text-[#00D26A]" : "text-[#FF5252]"}`}>
                        {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* NEWS tab */}
          {sectionTab === "NEWS" && (
            <div className="space-y-3">
              {indexNews.map((news) => (
                <Link key={news.id} href={`/news/${news.id}`} className="block border border-white/8 p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-[var(--font-anton)] text-[9px] tracking-[0.1em] text-white/40">{news.ticker}</span>
                    <span className={`text-[9px] font-medium ${news.sentiment >= 0 ? "text-[#00D26A]" : "text-[#FF5252]"}`}>
                      {news.sentiment >= 0 ? "+" : ""}{news.sentiment.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/60 leading-relaxed mb-2">{news.headline}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30">{news.name}</span>
                    <span className="text-[9px] tracking-[0.1em] text-white/25">{formatRelativeTime(news.timestamp)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* EVENTS tab */}
          {sectionTab === "EVENTS" && (
            <div className="space-y-3">
              {indexEvents.map((event, i) => (
                <div key={i} className="border border-white/8 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[8px] tracking-[0.15em] font-semibold px-2 py-0.5 border ${typeColors[event.type] || typeColors.EVENT}`}>
                      {event.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] text-white/60">{event.title}</p>
                      <span className="text-[9px] text-white/30">{event.ticker}</span>
                    </div>
                  </div>
                  <span className="text-[9px] tracking-[0.1em] text-white/25 whitespace-nowrap ml-3">
                    {new Date(event.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* FUNDAMENTALS tab */}
          {sectionTab === "FUNDAMENTALS" && fundamentals && (
            <>
              <div className="mb-7 md:mb-8">
                <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">AGGREGATE FUNDAMENTALS</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-white/8">
                  {[
                    { label: "TOTAL MARKET CAP", value: fundamentals.totalMarketCap },
                    { label: "AVG P/E RATIO", value: fundamentals.avgPE },
                    { label: "TOTAL VOLUME", value: fundamentals.totalVolume },
                  ].map((item) => (
                    <div key={item.label} className="bg-bg p-4">
                      <p className="text-[9px] tracking-[0.2em] text-white/25 uppercase mb-1.5">{item.label}</p>
                      <p className="font-[var(--font-anton)] text-base">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">SECTOR BREAKDOWN</h3>
                <div className="space-y-2">
                  {fundamentals.sectors.map(([sector, count]) => (
                    <div key={sector} className="border border-white/8 p-4 flex items-center justify-between">
                      <span className="text-[11px] text-white/60">{sector}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-white/8 overflow-hidden">
                          <div
                            className="h-full bg-white/30"
                            style={{ width: `${(count / fundamentals.stockCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-[var(--font-anton)] text-white/50 w-8 text-right">{count}</span>
                        <span className="text-[9px] text-white/25 w-12 text-right">{((count / fundamentals.stockCount) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar - desktop only */}
        <aside className="hidden lg:block lg:border-l lg:border-white/8 lg:pl-6">
          <div className="space-y-6">
            {/* Index Stats */}
            <div className="border border-white/8 p-5">
              <h3 className="text-[10px] tracking-[0.15em] text-white/40 mb-4">INDEX STATS</h3>
              <div className="space-y-3">
                {[
                  { label: "VALUE", val: idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) },
                  { label: "CHANGE", val: `${idx.change >= 0 ? "+" : ""}${idx.change.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
                  { label: "CHANGE %", val: `${idx.changePercent >= 0 ? "+" : ""}${idx.changePercent.toFixed(2)}%` },
                  { label: "STOCKS", val: String(constituents.length) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-[11px]">
                    <span className="text-white/40">{row.label}</span>
                    <span className="font-medium">{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Gainers */}
            {gainers.length > 0 && (
              <div className="border border-white/8 p-5">
                <h3 className="text-[10px] tracking-[0.15em] text-[#00D26A]/60 mb-3">TOP GAINERS</h3>
                {gainers.map((s) => (
                  <Link key={s.ticker} href={`/stock/${s.ticker}`} className="flex justify-between py-1.5 hover:opacity-70 transition-opacity">
                    <span className="text-[10px]">{s.ticker}</span>
                    <span className="text-[10px] text-[#00D26A]">+{s.changePercent.toFixed(2)}%</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Top Losers */}
            {losers.length > 0 && (
              <div className="border border-white/8 p-5">
                <h3 className="text-[10px] tracking-[0.15em] text-[#FF5252]/60 mb-3">TOP LOSERS</h3>
                {losers.map((s) => (
                  <Link key={s.ticker} href={`/stock/${s.ticker}`} className="flex justify-between py-1.5 hover:opacity-70 transition-opacity">
                    <span className="text-[10px]">{s.ticker}</span>
                    <span className="text-[10px] text-[#FF5252]">{s.changePercent.toFixed(2)}%</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Sidebar News */}
            {indexNews.length > 0 && (
              <div>
                <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-3">NEWS</h3>
                <div className="space-y-2">
                  {indexNews.slice(0, 4).map((news) => (
                    <Link key={news.id} href={`/news/${news.id}`} className="block border border-white/8 p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] tracking-[0.1em] text-white/30">{news.ticker}</span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed mb-2">{news.headline}</p>
                      <span className="text-[9px] tracking-[0.1em] text-white/25">{formatRelativeTime(news.timestamp)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Sidebar Events */}
            {indexEvents.length > 0 && (
              <div>
                <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-3">UPCOMING EVENTS</h3>
                <div className="space-y-2">
                  {indexEvents.slice(0, 5).map((event, i) => (
                    <div key={i} className="border border-white/8 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[7px] tracking-[0.15em] font-semibold px-1.5 py-0.5 border ${typeColors[event.type] || typeColors.EVENT}`}>
                          {event.type}
                        </span>
                        <div>
                          <p className="text-[11px] text-white/60">{event.title}</p>
                          <span className="text-[8px] text-white/25">{event.ticker}</span>
                        </div>
                      </div>
                      <span className="text-[9px] tracking-[0.1em] text-white/25 whitespace-nowrap ml-3">
                        {new Date(event.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

    </div>
  );
}
