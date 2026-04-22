"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import LoginPrompt from "@/components/LoginPrompt";
import { useAuth } from "@/lib/AuthContext";
import { getPortfolioAnalysis, getPortfolio, type PortfolioAnalysis, type Portfolio } from "@/lib/api";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export default function AnalysePage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    Promise.all([
      getPortfolioAnalysis(),
      getPortfolio(),
    ]).then(([aRes, pRes]) => {
      if (aRes.data) setAnalysis(aRes.data);
      if (pRes.data) setPortfolio(pRes.data);
      setLoading(false);
    });
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="py-6">
        <LoginPrompt message="Log in to view your portfolio analysis." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6">
        <p className="text-[11px] text-white/25 animate-pulse tracking-[0.1em]">LOADING ANALYSIS...</p>
      </div>
    );
  }

  const portfolioValue = portfolio
    ? portfolio.holdings.reduce((sum, h) => sum + (h.current_price ?? h.avg_price) * h.quantity, 0) + portfolio.balance
    : 0;
  const holdingsCount = portfolio?.holdings.length ?? 0;

  return (
    <div className="py-6 md:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 mb-8"
      >
        <button
          onClick={() => router.back()}
          className="w-11 h-11 border border-white/20 flex items-center justify-center hover:border-white transition-colors"
        >
          <ArrowLeft size={15} />
        </button>
        <h1 className="font-[var(--font-anton)] text-lg md:text-xl tracking-[0.1em]">PORTFOLIO ANALYSIS</h1>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="border border-white/10 p-5 mb-7"
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1">PORTFOLIO VALUE</p>
            <p className="font-[var(--font-anton)] text-2xl md:text-3xl tracking-tight">
              ₹{portfolioValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <p className="text-[11px] text-white/40">{holdingsCount} stocks</p>
        </div>
      </motion.div>

      {!analysis ? (
        <div className="py-16 text-center">
          <p className="text-[11px] tracking-[0.15em] text-white/25 uppercase">NO ANALYSIS DATA YET</p>
          <p className="text-[10px] text-white/20 mt-2">Place trades to generate portfolio analytics</p>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-3 gap-[1px] bg-white/8 mb-7"
          >
            <div className="bg-bg p-4">
              <p className="text-[9px] tracking-[0.15em] text-white/25 mb-1">XIRR</p>
              <p className={`font-[var(--font-anton)] text-xl ${analysis.xirr >= 0 ? "text-up" : "text-down"}`}>
                {analysis.xirr >= 0 ? "+" : ""}{analysis.xirr.toFixed(2)}%
              </p>
            </div>
            <div className="bg-bg p-4">
              <p className="text-[9px] tracking-[0.15em] text-white/25 mb-1">BENCHMARK RTN</p>
              <p className={`font-[var(--font-anton)] text-xl ${analysis.benchmarkReturn >= 0 ? "text-up" : "text-down"}`}>
                {analysis.benchmarkReturn >= 0 ? "+" : ""}{analysis.benchmarkReturn.toFixed(2)}%
              </p>
            </div>
            <div className="bg-bg p-4">
              <p className="text-[9px] tracking-[0.15em] text-white/25 mb-1">ALPHA</p>
              <p className={`font-[var(--font-anton)] text-xl ${analysis.alpha >= 0 ? "text-up" : "text-down"}`}>
                {analysis.alpha >= 0 ? "+" : ""}{analysis.alpha.toFixed(2)}%
              </p>
            </div>
          </motion.div>

          {/* Sector Allocation */}
          {analysis.sectorAllocation.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mb-7"
            >
              <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">SECTOR ALLOCATION</h3>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analysis.sectorAllocation.map(s => ({ sector: s.sector, value: s.percentage }))}
                        dataKey="value"
                        nameKey="sector"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={35}
                        strokeWidth={1}
                        stroke="#0a0a0a"
                        isAnimationActive={false}
                      >
                        {analysis.sectorAllocation.map((_, idx) => (
                          <Cell key={idx} fill={["#fff", "#888", "#555", "#aaa", "#666", "#ccc"][idx % 6]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.15)", fontSize: 11, color: "#fff" }}
                        formatter={(value) => [`${value}%`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {analysis.sectorAllocation.map((s, i) => (
                    <div key={s.sector} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5" style={{ backgroundColor: ["#fff", "#888", "#555", "#aaa", "#666", "#ccc"][i % 6] }} />
                        <span className="text-[10px] text-white/50">{s.sector}</span>
                      </div>
                      <span className="text-[11px] font-[var(--font-anton)]">{s.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Top Gainers & Losers */}
          {(analysis.topGainers.length > 0 || analysis.topLosers.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7"
            >
              {analysis.topGainers.length > 0 && (
                <div className="border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={14} className="text-up" />
                    <h3 className="text-[10px] tracking-[0.15em] text-white/40">TOP GAINERS</h3>
                  </div>
                  <div className="space-y-2">
                    {analysis.topGainers.map(stock => (
                      <div key={stock.ticker} className="flex items-center justify-between">
                        <span className="text-[11px] text-white/60">{stock.ticker}</span>
                        <span className="text-[11px] font-medium text-up">
                          {stock.returnPct >= 0 ? "+" : ""}{stock.returnPct.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.topLosers.length > 0 && (
                <div className="border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown size={14} className="text-down" />
                    <h3 className="text-[10px] tracking-[0.15em] text-white/40">TOP LOSERS</h3>
                  </div>
                  <div className="space-y-2">
                    {analysis.topLosers.map(stock => (
                      <div key={stock.ticker} className="flex items-center justify-between">
                        <span className="text-[11px] text-white/60">{stock.ticker}</span>
                        <span className="text-[11px] font-medium text-down">{stock.returnPct.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Risk Score */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-7"
          >
            <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">PORTFOLIO RISK</h3>
            <div className="border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-white/40" />
                  <span className="text-[10px] tracking-[0.1em] text-white/40">RISK SCORE</span>
                </div>
                <span className={`font-[var(--font-anton)] text-xl ${
                  analysis.riskScore <= 30 ? "text-up" : analysis.riskScore <= 60 ? "text-yellow-400" : "text-down"
                }`}>
                  {analysis.riskScore.toFixed(1)}
                </span>
              </div>
              <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    analysis.riskScore <= 30 ? "bg-up" : analysis.riskScore <= 60 ? "bg-yellow-400" : "bg-down"
                  }`}
                  style={{ width: `${Math.min(analysis.riskScore, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-white/30 mt-2">
                <span>Low Risk</span>
                <span>Moderate</span>
                <span>High Risk</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
