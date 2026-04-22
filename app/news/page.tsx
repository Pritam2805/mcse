"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getNews, type NewsItem } from "@/lib/api";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function sentimentLabel(s: number): string {
  if (s > 0.3) return "BULLISH";
  if (s < -0.3) return "BEARISH";
  return "NEUTRAL";
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickerFilter, setTickerFilter] = useState("ALL");

  useEffect(() => {
    getNews({ limit: 100 }).then(res => {
      if (res.data) setItems(res.data);
      setLoading(false);
    });
  }, []);

  const allTickers = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) for (const t of item.related_tickers) set.add(t);
    return ["ALL", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    if (tickerFilter === "ALL") return items;
    return items.filter(n => n.related_tickers.includes(tickerFilter));
  }, [items, tickerFilter]);

  if (loading) {
    return (
      <div className="py-6">
        <h1 className="font-[var(--font-anton)] text-xl tracking-[0.1em] uppercase mb-8">NEWS</h1>
        <p className="text-[11px] text-white/25 animate-pulse tracking-[0.1em]">LOADING MARKET NEWS...</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-[var(--font-anton)] text-xl tracking-[0.1em] uppercase">NEWS</h1>
        <span className="text-[9px] tracking-[0.2em] text-white/20">{filtered.length} STORIES</span>
      </div>

      {/* Ticker filter */}
      <div className="flex flex-wrap gap-0 mb-8 border-b border-white/8 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {allTickers.map((t) => (
          <button
            key={t}
            onClick={() => setTickerFilter(t)}
            className={`text-[10px] tracking-[0.12em] px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              tickerFilter === t ? "border-white text-white" : "border-transparent text-white/30 hover:text-white/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <p className="text-[11px] text-white/25 py-16 text-center tracking-[0.1em]">
          {items.length === 0 ? "NO NEWS PUBLISHED YET — SIMULATION MUST BE RUNNING" : "NO STORIES FOR THIS TICKER"}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((news, i) => {
            const sent = news.sentiment;
            return (
              <motion.div
                key={news.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/news/${news.id}`}
                  className="block border border-white/6 p-5 hover:bg-white/[0.03] hover:border-white/12 transition-all duration-300 h-full"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {news.related_tickers.slice(0, 2).map(t => (
                      <span key={t} className="font-[var(--font-anton)] text-[10px] tracking-[0.06em] text-white/50">{t}</span>
                    ))}
                    <span className={`text-[9px] font-medium ml-auto ${sent > 0.1 ? "text-up" : sent < -0.1 ? "text-down" : "text-white/30"}`}>
                      {sentimentLabel(sent)}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/60 leading-[1.7] line-clamp-3 mb-4">{news.headline}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-white/30 uppercase text-[9px] tracking-[0.08em]">{news.source.replace("_", " ")}</span>
                    <span className="text-[9px] text-white/20">{formatRelativeTime(news.published_at)}</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
