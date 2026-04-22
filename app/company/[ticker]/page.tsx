"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, Users, Calendar, Building2, ExternalLink, TrendingUp, DollarSign, Target, Activity } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { parentDirectory } from "@/lib/mockData";
import { getCompanyGameState, getCredibility, getNews, getScreener, CompanyGameState, CredibilityData, type NewsItem, type ScreenerItem } from "@/lib/api";

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function MetricsPanel({ gameState }: { gameState: CompanyGameState | null }) {
  if (!gameState || gameState.subsidiaries.length === 0) {
    return (
      <div className="border border-white/6 p-5">
        <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">BUSINESS METRICS</p>
        <div className="h-24 flex items-center justify-center">
          <p className="text-[11px] text-white/20">No metrics available</p>
        </div>
      </div>
    );
  }

  const totalRevenue = gameState.subsidiaries.reduce((s, sub) => s + sub.revenue, 0);
  const totalProfit = gameState.subsidiaries.reduce((s, sub) => s + sub.profit, 0);
  const totalCash = gameState.subsidiaries.reduce((s, sub) => s + sub.cash, 0);
  const totalDebt = gameState.subsidiaries.reduce((s, sub) => s + sub.debt, 0);
  const avgQuality = Math.round(gameState.subsidiaries.reduce((s, sub) => s + sub.productQuality, 0) / gameState.subsidiaries.length);
  const avgSatisfaction = Math.round(gameState.subsidiaries.reduce((s, sub) => s + sub.customerSatisfaction, 0) / gameState.subsidiaries.length);

  return (
    <div className="border border-white/6 p-5">
      <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">BUSINESS METRICS</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.02] p-3 rounded-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={10} className="text-white/30" />
            <span className="text-[9px] text-white/30">Revenue</span>
          </div>
          <p className="font-[var(--font-anton)] text-[14px] text-white/80">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white/[0.02] p-3 rounded-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={10} className="text-white/30" />
            <span className="text-[9px] text-white/30">Profit</span>
          </div>
          <p className={`font-[var(--font-anton)] text-[14px] ${totalProfit >= 0 ? "text-up" : "text-down"}`}>
            {formatCurrency(totalProfit)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/30">Cash</span>
          <span className="text-[11px] text-white/60">{formatCurrency(totalCash)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/30">Debt</span>
          <span className="text-[11px] text-white/60">{formatCurrency(totalDebt)}</span>
        </div>
      </div>

      <div className="h-px bg-white/6 mb-4" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target size={10} className="text-white/25" />
            <span className="text-[10px] text-white/40">Product Quality</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-up rounded-full" style={{ width: `${avgQuality}%` }} />
            </div>
            <span className="text-[11px] font-medium text-white/60">{avgQuality}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity size={10} className="text-white/25" />
            <span className="text-[10px] text-white/40">Customer Satisfaction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgSatisfaction}%` }} />
            </div>
            <span className="text-[11px] font-medium text-white/60">{avgSatisfaction}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CredibilityPanel({ credibility }: { credibility: CredibilityData | null }) {
  if (!credibility) {
    return (
      <div className="border border-white/6 p-5">
        <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">CREDIBILITY</p>
        <div className="h-24 flex items-center justify-center">
          <p className="text-[11px] text-white/20">Loading...</p>
        </div>
      </div>
    );
  }

  const score = credibility.currentScore;
  const scoreColor = score >= 70 ? "text-up" : score >= 40 ? "text-yellow-400" : "text-down";

  return (
    <div className="border border-white/6 p-5">
      <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">CREDIBILITY SCORE</p>

      <div className="text-center mb-4">
        <p className={`font-[var(--font-anton)] text-[32px] ${scoreColor}`}>{score.toFixed(1)}</p>
        <p className="text-[9px] text-white/30">OUT OF 100</p>
      </div>

      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-4">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${score >= 70 ? "bg-up" : score >= 40 ? "bg-yellow-400" : "bg-down"}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {credibility.recentEvents.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] text-white/25">Recent impacts</p>
          {credibility.recentEvents.slice(0, 3).map((event, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 truncate flex-1">{event.type.replace(/_/g, " ")}</span>
              <span className={`text-[10px] font-medium ${event.impact >= 0 ? "text-up" : "text-down"}`}>
                {event.impact >= 0 ? "+" : ""}{event.impact.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompanyDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const router = useRouter();
  const company = parentDirectory[ticker.toUpperCase()];

  const [gameState, setGameState] = useState<CompanyGameState | null>(null);
  const [credibility, setCredibility] = useState<CredibilityData | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, ScreenerItem>>({});

  useEffect(() => {
    if (!company) return;
    const tickers = company.subsidiaries;

    Promise.all([
      getCompanyGameState(),
      getCredibility(ticker.toUpperCase()),
      getNews({ limit: 10 }),
      getScreener(),
    ]).then(([gameRes, credRes, newsRes, screenerRes]) => {
      if (gameRes.data) setGameState(gameRes.data);
      if (credRes.data) setCredibility(credRes.data);
      if (newsRes.data) {
        // Keep only news related to this company's tickers
        setNewsItems(newsRes.data.filter(n =>
          n.related_tickers.some(t => tickers.includes(t))
        ));
      }
      if (screenerRes.data) {
        const map: Record<string, ScreenerItem> = {};
        for (const s of screenerRes.data) map[s.ticker] = s;
        setStockMap(map);
      }
    });
  }, [ticker, company]);

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[11px] tracking-[0.2em] text-white/30 uppercase">Company not found</p>
          <Link href="/" className="text-[11px] tracking-[0.15em] text-white/50 border-b border-white/20 pb-0.5 hover:text-white hover:border-white transition-colors">
            BACK TO EXPLORE
          </Link>
        </div>
      </div>
    );
  }

  const subsidiaries = company.subsidiaries.map(t => stockMap[t]).filter(Boolean) as ScreenerItem[];
  const totalMarketCap = subsidiaries.reduce((sum, s) => sum + (s.market_cap ?? 0), 0);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 py-4 border-b border-white/8">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-11 h-11 border border-white/20 flex items-center justify-center hover:border-white active:bg-white/[0.04] transition-colors duration-150"
          >
            <ArrowLeft size={15} />
          </button>

          <div className="w-12 h-12 border border-white/25 flex items-center justify-center">
            <span className="font-[var(--font-anton)] text-lg tracking-wide text-white/70">{company.logoLetter}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-[var(--font-anton)] text-lg md:text-xl tracking-[0.05em]">{company.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] tracking-[0.15em] text-white/30">{company.ticker}</span>
              <span className="text-[8px] tracking-[0.1em] text-white/20 px-1.5 py-0.5 border border-white/8">HOLDING CO.</span>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
          {/* Left column */}
          <div className="space-y-8">
            {/* About */}
            <div>
              <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-3">ABOUT</p>
              <p className="text-[13px] leading-[1.8] text-white/60">{company.about}</p>
            </div>

            {/* Subsidiaries */}
            <div>
              <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">SUBSIDIARIES</p>
              <div className="space-y-3">
                {company.subsidiaries.map((t, i) => {
                  const sub = stockMap[t];
                  return (
                    <motion.div
                      key={t}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <Link
                        href={`/stock/${t}`}
                        className="flex items-center gap-4 border border-white/6 p-4 hover:bg-white/[0.03] transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-[var(--font-anton)] text-[14px] tracking-[0.05em]">{t}</p>
                            <ExternalLink size={10} className="text-white/20 group-hover:text-white/50 transition-colors" />
                          </div>
                          {sub && <p className="text-[11px] text-white/40 mt-1">{sub.name}</p>}
                          {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub.sector}</p>}
                        </div>
                        <div className="text-right shrink-0 min-w-[90px]">
                          <p className="font-[var(--font-anton)] text-[14px]">
                            {sub?.price !== null && sub?.price !== undefined
                              ? `₹${sub.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                              : "—"}
                          </p>
                          {sub?.change_pct !== null && sub?.change_pct !== undefined && (
                            <p className={`text-[11px] font-medium mt-0.5 ${sub.change_pct >= 0 ? "text-up" : "text-down"}`}>
                              {sub.change_pct >= 0 ? "+" : ""}{sub.change_pct.toFixed(2)}%
                            </p>
                          )}
                          {sub?.market_cap !== null && sub?.market_cap !== undefined && (
                            <p className="text-[9px] text-white/20 mt-0.5">MCap {formatCurrency(sub.market_cap)}</p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Latest News */}
            <div>
              <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">LATEST NEWS</p>
              {newsItems.length === 0 ? (
                <div className="border border-white/6 border-dashed p-8 text-center">
                  <Calendar size={20} className="mx-auto text-white/10 mb-3" />
                  <p className="text-[11px] tracking-[0.1em] text-white/20">No news published yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newsItems.slice(0, 5).map(news => (
                    <Link
                      key={news.id}
                      href={`/news/${news.id}`}
                      className="block border border-white/6 p-4 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {news.related_tickers.filter(t => company.subsidiaries.includes(t)).map(t => (
                          <span key={t} className="font-[var(--font-anton)] text-[10px] tracking-[0.05em] text-white/40">{t}</span>
                        ))}
                        <span className={`text-[9px] font-medium ml-auto ${
                          news.sentiment > 0.1 ? "text-up" : news.sentiment < -0.1 ? "text-down" : "text-white/30"
                        }`}>
                          {news.sentiment > 0.1 ? "BULLISH" : news.sentiment < -0.1 ? "BEARISH" : "NEUTRAL"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">{news.headline}</p>
                      {news.published_at && (
                        <p className="text-[8px] text-white/15 mt-1.5">
                          {new Date(news.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <CredibilityPanel credibility={credibility} />
            <MetricsPanel gameState={gameState} />

            {/* Key Facts */}
            <div className="border border-white/6 p-5">
              <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">KEY FACTS</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={12} className="text-white/20" />
                    <span className="text-[11px] text-white/40">Subsidiaries</span>
                  </div>
                  <span className="font-[var(--font-anton)] text-[13px]">{company.subsidiaries.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-white/20" />
                    <span className="text-[11px] text-white/40">Total Members</span>
                  </div>
                  <span className="font-[var(--font-anton)] text-[13px]">{company.totalEmployees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-white/20" />
                    <span className="text-[11px] text-white/40">Founded</span>
                  </div>
                  <span className="font-[var(--font-anton)] text-[13px]">{company.founded}</span>
                </div>
                {totalMarketCap > 0 && (
                  <>
                    <div className="h-px bg-white/6" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/40">Combined MCap</span>
                      <span className="font-[var(--font-anton)] text-[13px]">{formatCurrency(totalMarketCap)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sector Breakdown */}
            {subsidiaries.length > 0 && (
              <div className="border border-white/6 p-5">
                <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">SECTOR BREAKDOWN</p>
                <div className="space-y-3">
                  {subsidiaries.map(sub => (
                    <div key={sub.ticker} className="flex items-center justify-between">
                      <span className="text-[11px] text-white/40">{sub.ticker}</span>
                      <span className="text-[10px] text-white/25">{sub.sector}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Summary */}
            {subsidiaries.length > 0 && (
              <div className="border border-white/6 p-5">
                <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">PERFORMANCE</p>
                <div className="space-y-3">
                  {subsidiaries.map(sub => (
                    <div key={sub.ticker} className="flex items-center justify-between">
                      <span className="text-[11px] text-white/40">{sub.ticker}</span>
                      <div className="flex items-center gap-3">
                        {sub.pe_ratio !== null && (
                          <span className="text-[10px] text-white/25">P/E {sub.pe_ratio.toFixed(1)}</span>
                        )}
                        {sub.change_pct !== null && (
                          <span className={`text-[11px] font-medium ${sub.change_pct >= 0 ? "text-up" : "text-down"}`}>
                            {sub.change_pct >= 0 ? "+" : ""}{sub.change_pct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
