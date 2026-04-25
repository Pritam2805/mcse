"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface LiveIndex {
  slug: string;
  name: string;
  value: number;
  changePercent: number;
  constituentCount: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function IndexBar() {
  const [indices, setIndices] = useState<LiveIndex[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!API_BASE) return;
      try {
        const res = await fetch(`${API_BASE}/market/indices`);
        if (!res.ok) return;
        const data = (await res.json()) as LiveIndex[];
        if (!cancelled) setIndices(data);
      } catch {
        /* ignore — bar stays hidden if no live data */
      }
    }
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (indices.length === 0) return null;

  return (
    <div className="w-full bg-bg border-b border-white/8 overflow-x-auto scrollbar-hide">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex items-center justify-center gap-6 md:gap-8 px-4 md:px-6 h-8 min-w-max"
      >
        {indices.map((idx, i) => (
          <Link key={idx.slug} href={`/index/${idx.slug}`}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              className="flex items-center gap-1.5 md:gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <span className="text-[9px] md:text-[10px] tracking-[0.12em] text-white/40 uppercase">
                {idx.name}
              </span>
              <span className="text-[10px] md:text-[11px] font-[var(--font-anton)] text-white">
                {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-[9px] md:text-[10px] font-medium ${idx.changePercent >= 0 ? "text-up" : "text-down"}`}>
                {idx.changePercent >= 0 ? "+" : ""}{idx.changePercent.toFixed(2)}%
              </span>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
