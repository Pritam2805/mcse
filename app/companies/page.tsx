"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { parentCompanies } from "@/lib/mockData";
import { useLiveStocks } from "@/lib/useLiveStocks";

export default function CompaniesPage() {
  const router = useRouter();
  const { stocks: liveStocks } = useLiveStocks();

  return (
    <div className="py-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="w-11 h-11 border border-white/20 flex items-center justify-center hover:border-white transition-colors"
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <h1 className="font-[var(--font-anton)] text-xl tracking-[0.1em] uppercase">
            HOLDING COMPANIES
          </h1>
          <p className="text-[10px] tracking-[0.15em] text-white/30 mt-0.5">
            {parentCompanies.length} GROUPS LISTED
          </p>
        </div>
      </div>

      {/* Companies list */}
      <div className="space-y-[1px] bg-white/8">
        {parentCompanies.map((pc, i) => {
          // Pull LIVE changePct for each subsidiary from the /api/market/stocks
          // polling hook; fall back to 0 if the live map hasn't loaded yet.
          const subLiveChanges = pc.subsidiaries
            .map((t) => liveStocks.get(t)?.changePct)
            .filter((v): v is number => typeof v === "number");
          const avgChange =
            subLiveChanges.length > 0
              ? subLiveChanges.reduce((s, v) => s + v, 0) / subLiveChanges.length
              : 0;

          return (
            <motion.div
              key={pc.ticker}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
            >
              <Link
                href={`/company/${pc.ticker}`}
                className="flex items-center gap-4 bg-bg p-5 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="w-11 h-11 border border-white/20 flex items-center justify-center shrink-0 group-hover:border-white/40 transition-colors">
                  <span className="font-[var(--font-anton)] text-lg text-white/60">
                    {pc.logoLetter}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-[var(--font-anton)] text-[14px] tracking-[0.05em] group-hover:text-white transition-colors">
                      {pc.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] tracking-[0.1em] text-white/25">
                      {pc.ticker}
                    </span>
                    <span className="text-white/8">·</span>
                    <span className="text-[9px] text-white/20">
                      {pc.subsidiaries.length} subsidiaries
                    </span>
                    <span className="text-white/8 hidden md:inline">·</span>
                    <span className="text-[9px] text-white/20 hidden md:inline">
                      {pc.totalEmployees} members
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 md:hidden">
                    {pc.subsidiaries.map((t) => (
                      <span
                        key={t}
                        className="text-[8px] tracking-[0.08em] text-white/20"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-[12px] font-medium ${
                      avgChange >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {avgChange >= 0 ? "+" : ""}
                    {avgChange.toFixed(2)}%
                  </p>
                  <p className="text-[9px] text-white/20 mt-0.5">
                    {pc.subsidiaries.length} subs
                  </p>
                </div>
                <ChevronRight
                  size={12}
                  className="text-white/15 group-hover:text-white/40 transition-colors shrink-0 hidden md:block"
                />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
