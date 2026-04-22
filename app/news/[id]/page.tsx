"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { getNewsItem, type NewsItem } from "@/lib/api";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function NewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [news, setNews] = useState<NewsItem | null | undefined>(undefined);

  useEffect(() => {
    getNewsItem(id).then(res => {
      setNews(res.data ?? null);
    });
  }, [id]);

  if (news === undefined) {
    return (
      <div className="py-6 max-w-2xl mx-auto">
        <p className="text-[11px] text-white/25 animate-pulse tracking-[0.1em]">LOADING...</p>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <h1 className="font-[var(--font-anton)] text-2xl tracking-[0.1em] uppercase mb-4">ARTICLE NOT FOUND</h1>
        <Link href="/news" className="text-[10px] tracking-[0.15em] text-white/40 hover:text-white transition-colors">
          ← BACK TO NEWS
        </Link>
      </div>
    );
  }

  const sent = news.sentiment;

  return (
    <div className="mobile-content-pad max-w-2xl mx-auto py-6">
      <motion.button
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-[10px] tracking-[0.15em]">BACK</span>
      </motion.button>

      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Meta */}
        <div className="flex items-center gap-3 flex-wrap mb-5">
          {news.related_tickers.map(t => (
            <Link
              key={t}
              href={`/stock/${t}`}
              className="font-[var(--font-anton)] text-[11px] tracking-[0.1em] text-white/50 hover:text-white transition-colors"
            >
              {t}
            </Link>
          ))}
          <span className={`text-[10px] font-medium ml-auto ${sent > 0.1 ? "text-[#00D26A]" : sent < -0.1 ? "text-[#FF5252]" : "text-white/30"}`}>
            {sent > 0.1 ? "BULLISH" : sent < -0.1 ? "BEARISH" : "NEUTRAL"}
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-[var(--font-anton)] text-xl md:text-2xl tracking-[0.03em] leading-snug mb-6">
          {news.headline}
        </h1>

        {/* Byline */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/8 flex-wrap">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">{news.source.replace(/_/g, " ")}</span>
          <span className="text-[9px] text-white/20">{formatTime(news.published_at)}</span>
          <span className="text-[9px] text-white/15 ml-auto">MACRO TICK {news.macro_tick}</span>
        </div>

        {/* Body */}
        <div className="text-[13px] md:text-[14px] text-white/55 leading-[1.9] whitespace-pre-line mb-10">
          {news.body}
        </div>

        {/* Footer links to related stocks */}
        {news.related_tickers.length > 0 && (
          <div className="pt-6 border-t border-white/8 flex flex-wrap gap-3">
            {news.related_tickers.map(t => (
              <Link
                key={t}
                href={`/stock/${t}`}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.15em] text-white/40 hover:text-white border border-white/15 hover:border-white/40 px-4 py-2.5 transition-all duration-200"
              >
                VIEW {t} DETAILS
              </Link>
            ))}
          </div>
        )}
      </motion.article>
    </div>
  );
}
