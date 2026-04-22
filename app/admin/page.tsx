"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  BarChart3,
  Shield,
  Activity,
  DollarSign,
  AlertTriangle,
  Newspaper,
  Calendar,
  Plus,
  Power,
  Eye,
  EyeOff,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Settings,
  Zap,
  Timer,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { useAuth, type UserRole } from "@/lib/AuthContext";
import { useAdmin } from "@/lib/AdminContext";
import { useDayTick } from "@/lib/WebSocketContext";
import { injectEvent, getPlatformMetrics, PlatformMetrics, getLedger, LedgerEntry, getInvestors, Investor, topupInvestor } from "@/lib/api";
import {
  enigmaCompanyData,
  stockDirectory,
  allStocksRaw,
} from "@/lib/mockData";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

/* â”€â”€â”€ Mock platform data (totalAdmin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const platformStats = {
  totalUsers: 248,
  activeToday: 67,
  totalTrades: 1_842,
  totalVolume: 24_87_693,
  listedStocks: 7,
};

const recentUsers = [
  { name: "ARUN KUMAR", email: "arun@mcse.in", role: "user" as UserRole, trades: 34, balance: 12_450, joined: "2025-01-15" },
  { name: "PRIYA SHARMA", email: "priya@mcse.in", role: "user" as UserRole, trades: 21, balance: 8_920, joined: "2025-01-18" },
  { name: "RAHUL VERMA", email: "rahul@mcse.in", role: "company" as UserRole, trades: 15, balance: 45_300, joined: "2025-01-10" },
  { name: "MEENA REDDY", email: "meena@mcse.in", role: "user" as UserRole, trades: 42, balance: 23_100, joined: "2025-01-12" },
  { name: "VIKASH PATEL", email: "vikash@mcse.in", role: "user" as UserRole, trades: 8, balance: 5_200, joined: "2025-01-20" },
  { name: "ANANYA IYER", email: "ananya@mcse.in", role: "user" as UserRole, trades: 19, balance: 15_780, joined: "2025-01-14" },
  { name: "KARTHIK NAIR", email: "karthik@mcse.in", role: "admin" as UserRole, trades: 0, balance: 0, joined: "2025-01-01" },
  { name: "DIVYA JOSHI", email: "divya@mcse.in", role: "user" as UserRole, trades: 27, balance: 18_600, joined: "2025-01-16" },
  { name: "SURESH MENON", email: "suresh@mcse.in", role: "user" as UserRole, trades: 11, balance: 7_340, joined: "2025-01-19" },
  { name: "FATIMA KHAN", email: "fatima@mcse.in", role: "company" as UserRole, trades: 6, balance: 31_500, joined: "2025-01-08" },
];

const activityFeed = [
  { action: "BUY ORDER", detail: "MACAD × 10 @ ₹1,198", time: "2 min ago", color: "text-up" },
  { action: "SELL ORDER", detail: "ECLOUD × 5 @ ₹3,215", time: "8 min ago", color: "text-down" },
  { action: "NEW USER", detail: "vikash@mcse.in registered", time: "15 min ago", color: "text-white/50" },
  { action: "BUY ORDER", detail: "CELBIO × 20 @ ₹2,148", time: "23 min ago", color: "text-up" },
  { action: "SELL ORDER", detail: "INDATA × 15 @ ₹282", time: "45 min ago", color: "text-down" },
];
/* ═══════════════════════════════════════════════════
   Day/Tick Counter Component
   ═══════════════════════════════════════════════════ */
function DayTickCounter() {
  const dayTick = useDayTick();

  if (!dayTick) {
    return (
      <div className="border border-white/10 p-5">
        <p className="text-[9px] tracking-[0.15em] text-white/30 mb-3">DAY / TICK COUNTER</p>
        <div className="flex items-center gap-2 text-white/20">
          <Timer size={14} />
          <span className="text-[10px]">Loading...</span>
        </div>
      </div>
    );
  }

  const tickProgress = (dayTick.dayTickCounter / dayTick.ticksPerDay) * 100;

  return (
    <div className="border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[9px] tracking-[0.15em] text-white/30">DAY / TICK COUNTER</p>
        <Link
          href="/admin/config"
          className="flex items-center gap-1 text-[9px] tracking-[0.1em] text-white/30 hover:text-white transition-colors"
        >
          <Settings size={11} />
          CONFIG
        </Link>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div>
          <p className="text-[8px] tracking-[0.15em] text-white/20 mb-1">DAY</p>
          <p className="font-[var(--font-anton)] text-3xl">{dayTick.dayNumber}</p>
        </div>
        <div className="h-12 w-px bg-white/10" />
        <div>
          <p className="text-[8px] tracking-[0.15em] text-white/20 mb-1">TICK</p>
          <p className="font-[var(--font-anton)] text-3xl">
            {dayTick.dayTickCounter}
            <span className="text-sm text-white/30">/{dayTick.ticksPerDay}</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${tickProgress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full ${dayTick.marketOpen ? "bg-up" : "bg-white/30"}`}
        />
      </div>
      <p className="text-[8px] text-white/20 mt-2">
        {dayTick.marketOpen ? "Market open" : "Market closed"} · {Math.round(tickProgress)}% of day complete
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Event Injection Form Component
   ═══════════════════════════════════════════════════ */
const EVENT_TYPES = [
  { id: "EARNINGS_BEAT", label: "Earnings Beat", impact: "+5% to +15%", color: "text-up" },
  { id: "EARNINGS_MISS", label: "Earnings Miss", impact: "-5% to -15%", color: "text-down" },
  { id: "DIVIDEND_ANNOUNCE", label: "Dividend Announced", impact: "+2% to +8%", color: "text-up" },
  { id: "SCANDAL", label: "Scandal/Controversy", impact: "-10% to -25%", color: "text-down" },
  { id: "ACQUISITION", label: "Acquisition News", impact: "±5% to ±20%", color: "text-amber-400" },
  { id: "REGULATORY_FINE", label: "Regulatory Fine", impact: "-3% to -12%", color: "text-down" },
  { id: "PRODUCT_LAUNCH", label: "Product Launch", impact: "+3% to +10%", color: "text-up" },
  { id: "LEADERSHIP_CHANGE", label: "Leadership Change", impact: "±2% to ±8%", color: "text-amber-400" },
] as const;

function EventInjectionForm() {
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { listedStocks } = useAdmin();

  async function handleInject() {
    if (!selectedTicker || !selectedEvent) return;

    setIsSubmitting(true);
    setFeedback(null);

    const res = await injectEvent({
      ticker: selectedTicker,
      eventType: selectedEvent,
      message: customMessage || undefined,
    });

    if (res.error) {
      setFeedback({ ok: false, text: `Failed: ${res.error}` });
    } else {
      setFeedback({ ok: true, text: `Event injected for ${selectedTicker}` });
      setSelectedEvent("");
      setCustomMessage("");
    }
    setIsSubmitting(false);
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <div className="border border-white/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-white/8 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-amber-400/60" />
          <p className="text-[9px] tracking-[0.15em] text-amber-400/60">INJECT MARKET EVENT</p>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {isExpanded && (
        <div className="px-5 py-4 space-y-4">
          {/* Ticker Select */}
          <div>
            <label className="text-[9px] tracking-[0.1em] text-white/30 block mb-2">TARGET STOCK</label>
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none appearance-none cursor-pointer"
            >
              <option value="">Select a stock...</option>
              {listedStocks.map((ticker) => (
                <option key={ticker} value={ticker} className="bg-[#111]">
                  {ticker}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type */}
          <div>
            <label className="text-[9px] tracking-[0.1em] text-white/30 block mb-2">EVENT TYPE</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt.id)}
                  className={`text-left px-3 py-2 border transition-all ${
                    selectedEvent === evt.id
                      ? "border-white/40 bg-white/5"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <p className="text-[10px] text-white/60">{evt.label}</p>
                  <p className={`text-[8px] ${evt.color}`}>{evt.impact}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="text-[9px] tracking-[0.1em] text-white/30 block mb-2">CUSTOM MESSAGE (OPTIONAL)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g., Company announces strategic partnership..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 resize-none"
            />
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`flex items-center gap-2 px-3 py-2 border text-[10px] ${
                feedback.ok
                  ? "bg-up/10 border-up/30 text-up"
                  : "bg-down/10 border-down/30 text-down"
              }`}
            >
              <AlertCircle size={12} />
              {feedback.text}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleInject}
            disabled={!selectedTicker || !selectedEvent || isSubmitting}
            className={`w-full py-2.5 text-[10px] tracking-[0.15em] font-semibold transition-all ${
              selectedTicker && selectedEvent && !isSubmitting
                ? "bg-amber-400 text-black hover:bg-amber-300"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "INJECTING..." : "INJECT EVENT"}
          </button>

          {/* Warning */}
          <p className="text-[9px] text-white/20 flex items-start gap-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            Events affect stock prices immediately. Use with caution during live trading.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Scandal Trigger Component
   ═══════════════════════════════════════════════════ */
function ScandalTrigger() {
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [magnitude, setMagnitude] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { listedStocks } = useAdmin();

  const magnitudeLabel = magnitude <= 25 ? "Minor" : magnitude <= 50 ? "Moderate" : magnitude <= 75 ? "Severe" : "Critical";
  const magnitudeColor = magnitude <= 25 ? "text-yellow-400" : magnitude <= 50 ? "text-orange-400" : magnitude <= 75 ? "text-red-400" : "text-red-600";

  async function handleTrigger() {
    if (!selectedTicker) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { triggerScandal } = await import("@/lib/api");
      const res = await triggerScandal(selectedTicker, magnitude);

      if (res.error) {
        setFeedback({ ok: false, text: `Failed: ${res.error}` });
      } else {
        setFeedback({ ok: true, text: `Scandal triggered for ${selectedTicker}` });
        setSelectedTicker("");
        setMagnitude(50);
      }
    } catch {
      setFeedback({ ok: false, text: "Failed to trigger scandal" });
    }
    setIsSubmitting(false);
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <div className="border border-red-500/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-red-500/10 hover:bg-red-500/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-red-400/60" />
          <p className="text-[9px] tracking-[0.15em] text-red-400/60">SCANDAL TRIGGER</p>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {isExpanded && (
        <div className="px-5 py-4 space-y-4">
          <p className="text-[10px] text-white/40 leading-relaxed">
            Trigger a scandal event that will negatively impact the selected company&apos;s stock price and credibility score.
          </p>

          <div>
            <label className="text-[9px] tracking-[0.1em] text-white/30 block mb-2">TARGET COMPANY</label>
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none appearance-none cursor-pointer"
            >
              <option value="">Select a company...</option>
              {listedStocks.map((ticker) => (
                <option key={ticker} value={ticker} className="bg-[#111]">
                  {ticker}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] tracking-[0.1em] text-white/30">SCANDAL MAGNITUDE</label>
              <span className={`text-[10px] font-medium ${magnitudeColor}`}>{magnitudeLabel} ({magnitude}%)</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={magnitude}
              onChange={(e) => setMagnitude(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400"
            />
            <div className="flex justify-between text-[8px] text-white/20 mt-1">
              <span>Minor</span>
              <span>Moderate</span>
              <span>Severe</span>
              <span>Critical</span>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 p-3">
            <p className="text-[9px] text-red-400/60 mb-2">ESTIMATED IMPACT</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[8px] text-white/30">Price Impact</p>
                <p className="text-[11px] text-down font-medium">-{(magnitude * 0.25).toFixed(1)}% to -{(magnitude * 0.4).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[8px] text-white/30">Credibility Hit</p>
                <p className="text-[11px] text-down font-medium">-{Math.round(magnitude * 0.2)} to -{Math.round(magnitude * 0.35)} pts</p>
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-2 px-3 py-2 border text-[10px] ${
                feedback.ok ? "bg-up/10 border-up/30 text-up" : "bg-down/10 border-down/30 text-down"
              }`}
            >
              <AlertCircle size={12} />
              {feedback.text}
            </div>
          )}

          <button
            onClick={handleTrigger}
            disabled={!selectedTicker || isSubmitting}
            className={`w-full py-2.5 text-[10px] tracking-[0.15em] font-semibold transition-all ${
              selectedTicker && !isSubmitting
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "TRIGGERING..." : "TRIGGER SCANDAL"}
          </button>

          <p className="text-[9px] text-red-400/40 flex items-start gap-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            This action cannot be undone and will immediately affect the company.
          </p>
        </div>
      )}
    </div>
  );
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Enigma Company Admin Dashboard
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function EnigmaDashboard() {
  const co = enigmaCompanyData;
  const [activeSub, setActiveSub] = useState(co.subsidiaries[0]);
  const sub = stockDirectory[activeSub];
  const fund = sub.fundamentals;
  const chartData = sub.chartData["3D"];
  const { companyNews, companyEvents } = useAdmin();

  const recentNews = companyNews.slice(0, 3);
  const pendingCount = companyNews.filter((n) => n.status === "PENDING").length;
  const upcomingEvents = companyEvents
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <>
      {/* Company Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 border-2 border-white flex items-center justify-center">
            <span className="font-[var(--font-anton)] text-lg md:text-xl tracking-wider">E</span>
          </div>
          <div>
            <h1 className="font-[var(--font-anton)] text-2xl md:text-3xl tracking-[0.08em] uppercase">ENIGMA GROUP</h1>
            <p className="text-[10px] text-white/30 tracking-[0.1em] mt-0.5">Enigma Computer Science · COMPANY DASHBOARD</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <p className="font-[var(--font-anton)] text-2xl">{"\u20B9"}{sub.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className={`text-[11px] font-medium ${sub.changePercent >= 0 ? "text-up" : "text-down"}`}>
            {sub.changePercent >= 0 ? "+" : ""}{sub.changePercent.toFixed(2)}%
          </p>
        </div>
      </motion.div>

      {/* Subsidiary Tabs */}
      <div className="flex items-center gap-6 mb-6 overflow-x-auto scrollbar-hide border-b border-white/10">
        {co.subsidiaries.map((ticker) => {
          const s = stockDirectory[ticker];
          const active = ticker === activeSub;
          return (
            <button
              key={ticker}
              onClick={() => setActiveSub(ticker)}
              className={`pb-3 text-[10px] tracking-[0.12em] font-medium whitespace-nowrap transition-colors duration-200 relative ${
                active
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {ticker}
              <span className={`ml-2 text-[9px] ${s.changePercent >= 0 ? "text-up" : "text-down"}`}>
                {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
              </span>
              {active && <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />}
            </button>
          );
        })}
      </div>

      {/* Metrics Strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-white/8 mb-8"
      >
        <div className="bg-bg p-4 md:p-5">
          <span className="text-[9px] tracking-[0.15em] text-white/25">SHARES IN CIRCULATION</span>
          <p className="font-[var(--font-anton)] text-lg mt-1">{co.sharesInCirculation.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-bg p-4 md:p-5">
          <span className="text-[9px] tracking-[0.15em] text-white/25">MARKET CAP</span>
          <p className="font-[var(--font-anton)] text-lg mt-1">{fund.marketCap}</p>
        </div>
        <div className="bg-bg p-4 md:p-5">
          <span className="text-[9px] tracking-[0.15em] text-white/25">VOLUME</span>
          <p className="font-[var(--font-anton)] text-lg mt-1">{fund.volume}</p>
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="md:grid md:grid-cols-[3fr_2fr] md:gap-8 space-y-6 md:space-y-0">
        {/* Left column */}
        <div className="space-y-6">
          {/* Stock Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="border border-white/10 p-5"
          >
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-4">STOCK PERFORMANCE · 3D</p>
            <div className="h-48 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="enigmaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sub.changePercent >= 0 ? "var(--color-up)" : "var(--color-down)"} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={sub.changePercent >= 0 ? "var(--color-up)" : "var(--color-down)"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }}
                    labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                    itemStyle={{ color: "white" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={sub.changePercent >= 0 ? "var(--color-up)" : "var(--color-down)"}
                    strokeWidth={1.5}
                    fill="url(#enigmaFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="border border-white/10 p-5"
          >
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-3">ABOUT {activeSub}</p>
            <p className="text-[12px] text-white/40 leading-relaxed">{sub.about}</p>
          </motion.div>

          {/* Company News â€” Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="border border-white/10"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Newspaper size={13} className="text-white/30" />
                <p className="text-[9px] tracking-[0.15em] text-white/30">COMPANY NEWS</p>
                {pendingCount > 0 && (
                  <span className="text-[7px] tracking-[0.1em] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5">{pendingCount} PENDING</span>
                )}
              </div>
              <Link href="/admin?tab=news" className="text-[9px] tracking-[0.1em] text-white/40 hover:text-white transition-colors">
                VIEW ALL {"\u2192"}
              </Link>
            </div>
            {recentNews.length > 0 ? recentNews.map((n, i) => (
              <div key={n.id} className={`px-5 py-3.5 ${i < recentNews.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[7px] tracking-[0.1em] px-1 py-0.5 border ${
                    n.status === "PENDING" ? "text-amber-400 border-amber-400/20" :
                    n.status === "PUBLISHED" ? "text-up border-up/20" :
                    "text-down border-down/20"
                  }`}>{n.status}</span>
                </div>
                <p className="text-[11px] text-white/60">{n.title}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{new Date(n.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
            )) : (
              <div className="px-5 py-6 text-center">
                <p className="text-[10px] text-white/20">No news articles yet</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Largest Shareholders */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="border border-white/10"
          >
            <div className="px-5 py-4 border-b border-white/8">
              <p className="text-[9px] tracking-[0.15em] text-white/30">LARGEST SHAREHOLDERS</p>
            </div>
            {co.shareholders.map((sh, i) => (
              <div key={sh.name} className={`flex items-center justify-between px-5 py-3 ${i < co.shareholders.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/20 w-4">{i + 1}</span>
                  <span className="text-[11px] text-white/60">{sh.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-white/40 font-[var(--font-anton)]">{sh.shares.toLocaleString("en-IN")}</span>
                  <span className="text-[9px] text-white/20 ml-2">{sh.percentage}%</span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Events â€” Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="border border-white/10"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-white/30" />
                <p className="text-[9px] tracking-[0.15em] text-white/30">UPCOMING EVENTS</p>
              </div>
              <Link href="/admin?tab=events" className="text-[9px] tracking-[0.1em] text-white/40 hover:text-white transition-colors">
                VIEW ALL {"\u2192"}
              </Link>
            </div>
            {upcomingEvents.length > 0 ? upcomingEvents.map((ev, i) => (
              <div key={ev.id} className={`flex items-center justify-between px-5 py-3 ${i < upcomingEvents.length - 1 ? "border-b border-white/6" : ""}`}>
                <div>
                  <p className="text-[11px] text-white/60">{ev.title}</p>
                  <p className="text-[10px] text-white/25 mt-0.5">{new Date(ev.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>
            )) : (
              <div className="px-5 py-6 text-center">
                <p className="text-[10px] text-white/20">No upcoming events</p>
              </div>
            )}
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="border border-white/10 p-5"
          >
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-3">QUICK STATS</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "EPS", val: `₹${fund.eps}` },
                { label: "BOOK VALUE", val: `₹${fund.bookValue.toLocaleString("en-IN")}` },
                { label: "ROE", val: `${fund.roe}%` },
                { label: "VOLUME", val: fund.volume },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[9px] tracking-[0.1em] text-white/20">{s.label}</p>
                  <p className="font-[var(--font-anton)] text-sm mt-0.5">{s.val}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Total Admin Dashboard
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•submitNews, approveNews, rejectNews, companyEvents, addEvent, removeEvent•â•â•â•â•â• */
function TotalAdminDashboard() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { marketOpen, toggleMarket, listedStocks, toggleListing, announcements, addAnnouncement, companyNews, approveNews, rejectNews, companyEvents, removeEvent } = useAdmin();
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  
  // Platform metrics from API
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  
  // Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<{ ticker: string; type: string }>({ ticker: "", type: "" });
  
  // Investors state
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investorsLoading, setInvestorsLoading] = useState(false);
  const [investorSearch, setInvestorSearch] = useState("");
  const [topupTarget, setTopupTarget] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  
  useEffect(() => {
    (async () => {
      const res = await getPlatformMetrics();
      if (res.data) setMetrics(res.data);
    })();
  }, []);

  // Track previous deps for render-time loading toggles
  const [prevLedgerKey, setPrevLedgerKey] = useState<string | null>(null);
  const ledgerKey = tab === "ledger" ? `${ledgerFilter.ticker}|${ledgerFilter.type}` : null;
  if (ledgerKey !== prevLedgerKey) {
    setPrevLedgerKey(ledgerKey);
    if (ledgerKey !== null) setLedgerLoading(true);
  }

  const [prevInvestorKey, setPrevInvestorKey] = useState<string | null>(null);
  const investorKey = tab === "investors" ? (investorSearch || "") : null;
  if (investorKey !== prevInvestorKey) {
    setPrevInvestorKey(investorKey);
    if (investorKey !== null) setInvestorsLoading(true);
  }
  
  // Fetch ledger when on ledger tab
  useEffect(() => {
    if (tab !== "ledger") return;
    let cancelled = false;
    getLedger({ 
      ticker: ledgerFilter.ticker || undefined, 
      type: ledgerFilter.type || undefined 
    }).then(res => {
      if (cancelled) return;
      if (res.data) setLedgerEntries(res.data.entries);
      setLedgerLoading(false);
    });
    return () => { cancelled = true; };
  }, [tab, ledgerFilter]);
  
  // Fetch investors when on investors tab
  useEffect(() => {
    if (tab !== "investors") return;
    let cancelled = false;
    getInvestors({ search: investorSearch || undefined }).then(res => {
      if (cancelled) return;
      if (res.data) setInvestors(res.data.investors);
      setInvestorsLoading(false);
    });
    return () => { cancelled = true; };
  }, [tab, investorSearch]);

  const pendingNews = companyNews.filter((n) => n.status === "PENDING");

  // Use API metrics or fallback to mock
  const stats: PlatformMetrics = metrics || {
    totalInvestors: platformStats.totalUsers,
    totalCompanies: platformStats.listedStocks,
    totalTrades: platformStats.totalTrades,
    totalVolume: platformStats.totalVolume,
    marketCap: 0,
    activeToday: platformStats.activeToday,
    connectedWsUsers: 0,
    orderRatePerMin: 0,
    llmLatencyP50: 0,
    llmLatencyP99: 0,
    redisHitRate: 0,
    macroTickDurationSecs: null,
  };

  function publishAnnouncement() {
    if (!annTitle.trim()) return;
    addAnnouncement(annTitle, annContent);
    setAnnTitle("");
    setAnnContent("");
    setShowAnnForm(false);
  }

  /* ——— USERS TAB ——— */
  if (tab === "users") {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="font-[var(--font-anton)] text-lg tracking-[0.08em]">ALL USERS</h2>
          <p className="text-[10px] text-white/30 mt-0.5">{recentUsers.length} registered · {stats.activeToday} active today</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-white/10">
          <div className="hidden md:grid grid-cols-[2fr_2fr_80px_80px_100px_80px] gap-4 px-5 py-3 border-b border-white/8">
            <span className="text-[9px] tracking-[0.15em] text-white/25">NAME</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">EMAIL</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">ROLE</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">TRADES</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">BALANCE</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">JOINED</span>
          </div>
          {recentUsers.map((user, i) => (
            <div key={user.email} className={`px-5 py-3.5 ${i < recentUsers.length - 1 ? "border-b border-white/6" : ""}`}>
              <div className="hidden md:grid grid-cols-[2fr_2fr_80px_80px_100px_80px] gap-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 border border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-[7px] tracking-wider text-white/40">{user.name.split(" ").map(w => w[0]).join("")}</span>
                  </div>
                  <span className="text-[11px] text-white/60">{user.name}</span>
                </div>
                <span className="text-[10px] text-white/40">{user.email}</span>
                <span className={`text-[8px] tracking-[0.1em] px-1.5 py-0.5 border w-fit ${
                  user.role === "admin" ? "text-amber-400 border-amber-400/20" :
                  user.role === "company" ? "text-blue-400 border-blue-400/20" :
                  "text-white/30 border-white/15"
                }`}>{user.role === "company" ? "CO." : user.role === "admin" ? "ADM" : "USER"}</span>
                <span className="text-[10px] text-white/40">{user.trades}</span>
                <span className="text-[10px] text-white/40">{"\u20B9"}{user.balance.toLocaleString("en-IN")}</span>
                <span className="text-[10px] text-white/30">{new Date(user.joined).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
              </div>
              <div className="md:hidden flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 border border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-[7px] tracking-wider text-white/40">{user.name.split(" ").map(w => w[0]).join("")}</span>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.05em] text-white/60">{user.name}</p>
                    <p className="text-[8px] text-white/25">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/40">{user.trades} trades · {"\u20B9"}{user.balance.toLocaleString("en-IN")}</p>
                  <span className={`text-[7px] tracking-[0.1em] px-1 py-0.5 border ${
                    user.role === "admin" ? "text-amber-400 border-amber-400/20" :
                    user.role === "company" ? "text-blue-400 border-blue-400/20" :
                    "text-white/25 border-white/15"
                  }`}>{user.role === "company" ? "CO." : user.role === "admin" ? "ADM" : "USER"}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </>
    );
  }

  /* ——— STOCKS TAB ——— */
  if (tab === "stocks") {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-[var(--font-anton)] text-lg tracking-[0.08em]">ALL STOCKS</h2>
            <p className="text-[10px] text-white/30 mt-0.5">{allStocksRaw.length} total · {listedStocks.length} listed</p>
          </div>
          <div className="flex items-center gap-2">
            <Power size={14} className={marketOpen ? "text-up" : "text-down"} />
            <button
              onClick={toggleMarket}
              className={`text-[9px] tracking-[0.1em] font-semibold px-3 py-1.5 border transition-all ${
                marketOpen
                  ? "bg-up/10 border-up/30 text-up hover:bg-up/20"
                  : "bg-down/10 border-down/30 text-down hover:bg-down/20"
              }`}
            >
              {marketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-white/10">
          <div className="hidden md:grid grid-cols-[60px_2fr_1fr_1fr_100px_80px] gap-4 px-5 py-3 border-b border-white/8">
            <span className="text-[9px] tracking-[0.15em] text-white/25">TICKER</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">NAME</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">PRICE</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">CHANGE</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">PARENT</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25 text-right">STATUS</span>
          </div>
          {allStocksRaw.map((stock, i) => {
            const isListed = listedStocks.includes(stock.ticker);
            return (
              <div key={stock.ticker} className={`px-5 py-3 ${i < allStocksRaw.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="hidden md:grid grid-cols-[60px_2fr_1fr_1fr_100px_80px] gap-4 items-center">
                  <span className={`text-[11px] tracking-[0.05em] font-medium ${isListed ? "text-white/70" : "text-white/20 line-through"}`}>{stock.ticker}</span>
                  <span className="text-[10px] text-white/40">{stock.name}</span>
                  <span className="text-[11px] text-white/60">{"\u20B9"}{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  <span className={`text-[10px] ${stock.changePercent >= 0 ? "text-up" : "text-down"}`}>
                    {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-white/25">{stock.parentCompany || "\u2014"}</span>
                  <button
                    onClick={() => toggleListing(stock.ticker)}
                    className={`flex items-center justify-end gap-1.5 text-[9px] tracking-[0.1em] px-2.5 py-1 border transition-all w-fit ml-auto ${
                      isListed ? "text-up border-up/20 hover:border-up/50" : "text-down border-down/20 hover:border-down/50"
                    }`}
                  >
                    {isListed ? <Eye size={11} /> : <EyeOff size={11} />}
                    {isListed ? "LISTED" : "DELISTED"}
                  </button>
                </div>
                <div className="md:hidden flex items-center justify-between">
                  <div>
                    <p className={`text-[11px] tracking-[0.05em] ${isListed ? "text-white/60" : "text-white/20 line-through"}`}>{stock.ticker}</p>
                    <p className="text-[9px] text-white/25">{stock.name}</p>
                  </div>
                  <button
                    onClick={() => toggleListing(stock.ticker)}
                    className={`flex items-center gap-1.5 text-[9px] tracking-[0.1em] px-2.5 py-1 border transition-all ${
                      isListed ? "text-up border-up/20 hover:border-up/50" : "text-down border-down/20 hover:border-down/50"
                    }`}
                  >
                    {isListed ? <Eye size={11} /> : <EyeOff size={11} />}
                    {isListed ? "LISTED" : "DELISTED"}
                  </button>
                </div>
              </div>
            );
          })}
        </motion.div>
      </>
    );
  }

  /* ——— LEDGER TAB ——— */
  if (tab === "ledger") {
    const typeColors: Record<string, string> = {
      BUY: "text-up border-up/20",
      SELL: "text-down border-down/20",
      IPO_ALLOT: "text-blue-400 border-blue-400/20",
      IPO_REFUND: "text-amber-400 border-amber-400/20",
      BALANCE_ADJUST: "text-purple-400 border-purple-400/20",
      INTRADAY_SQUAREOFF: "text-orange-400 border-orange-400/20",
    };
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="font-[var(--font-anton)] text-lg tracking-[0.08em]">TRANSACTION LEDGER</h2>
          <p className="text-[10px] text-white/30 mt-0.5">All platform transactions</p>
        </motion.div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={ledgerFilter.ticker}
            onChange={(e) => setLedgerFilter(f => ({ ...f, ticker: e.target.value }))}
            className="bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none appearance-none cursor-pointer min-w-[120px]"
          >
            <option value="">All tickers</option>
            {listedStocks.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
          </select>
          <select
            value={ledgerFilter.type}
            onChange={(e) => setLedgerFilter(f => ({ ...f, type: e.target.value }))}
            className="bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none appearance-none cursor-pointer min-w-[120px]"
          >
            <option value="">All types</option>
            <option value="BUY" className="bg-[#111]">BUY</option>
            <option value="SELL" className="bg-[#111]">SELL</option>
            <option value="IPO_ALLOT" className="bg-[#111]">IPO ALLOT</option>
            <option value="IPO_REFUND" className="bg-[#111]">IPO REFUND</option>
            <option value="BALANCE_ADJUST" className="bg-[#111]">BALANCE ADJUST</option>
            <option value="INTRADAY_SQUAREOFF" className="bg-[#111]">INTRADAY SQUAREOFF</option>
          </select>
        </div>
        
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-white/10">
          <div className="hidden md:grid grid-cols-[100px_70px_80px_70px_90px_1fr_1fr] gap-4 px-5 py-3 border-b border-white/8">
            <span className="text-[9px] tracking-[0.15em] text-white/25">TIME</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">TYPE</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">TICKER</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">QTY</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">PRICE</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">BUYER</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">SELLER</span>
          </div>
          {ledgerLoading ? (
            <div className="px-5 py-8 text-center">
              <Activity size={16} className="mx-auto text-white/20 animate-pulse mb-2" />
              <p className="text-[10px] text-white/20">Loading ledger...</p>
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[10px] text-white/20">No transactions found</p>
            </div>
          ) : (
            ledgerEntries.map((entry, i) => (
              <div key={entry.id} className={`px-5 py-3.5 ${i < ledgerEntries.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="hidden md:grid grid-cols-[100px_70px_80px_70px_90px_1fr_1fr] gap-4 items-center">
                  <span className="text-[10px] text-white/40">
                    {new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`text-[8px] tracking-[0.1em] px-1.5 py-0.5 border w-fit ${typeColors[entry.type] || "text-white/30 border-white/15"}`}>
                    {entry.type.replace("_", " ")}
                  </span>
                  <span className="text-[11px] font-[var(--font-anton)]">{entry.ticker}</span>
                  <span className="text-[10px] text-white/50">{entry.qty}</span>
                  <span className="text-[10px] text-white/50">{"\u20B9"}{entry.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-white/40">{entry.buyerName || "-"}</span>
                  <span className="text-[10px] text-white/40">{entry.sellerName || "-"}</span>
                </div>
                <div className="md:hidden space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[8px] tracking-[0.1em] px-1.5 py-0.5 border ${typeColors[entry.type] || "text-white/30 border-white/15"}`}>
                      {entry.type.replace("_", " ")}
                    </span>
                    <span className="text-[9px] text-white/30">
                      {new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-[var(--font-anton)] text-[11px]">{entry.ticker} × {entry.qty}</span>
                    <span className="text-[10px] text-white/50">{"\u20B9"}{entry.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[9px] text-white/30">{entry.buyerName || "—"} → {entry.sellerName || "—"}</p>
                </div>
              </div>
            ))
          )}
        </motion.div>
      </>
    );
  }

  /* ——— INVESTORS TAB ——— */
  if (tab === "investors") {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="font-[var(--font-anton)] text-lg tracking-[0.08em]">INVESTORS</h2>
          <p className="text-[10px] text-white/30 mt-0.5">{investors.length} registered investors</p>
        </motion.div>
        
        {/* Search */}
        <input
          type="text"
          value={investorSearch}
          onChange={(e) => setInvestorSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-md bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white outline-none placeholder:text-white/20 mb-6"
        />
        
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-white/10">
          <div className="hidden md:grid grid-cols-[2fr_2fr_100px_80px_100px_60px_140px] gap-4 px-5 py-3 border-b border-white/8">
            <span className="text-[9px] tracking-[0.15em] text-white/25">NAME</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">EMAIL</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">BALANCE</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">KYC</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">PORTFOLIO</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">TRADES</span>
            <span className="text-[9px] tracking-[0.15em] text-white/25">TOPUP</span>
          </div>
          {investorsLoading ? (
            <div className="px-5 py-8 text-center">
              <Users size={16} className="mx-auto text-white/20 animate-pulse mb-2" />
              <p className="text-[10px] text-white/20">Loading investors...</p>
            </div>
          ) : investors.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[10px] text-white/20">No investors found</p>
            </div>
          ) : (
            investors.map((investor, i) => (
              <div key={investor.investorId} className={`px-5 py-3.5 ${i < investors.length - 1 ? "border-b border-white/6" : ""} ${investor.isSuspended ? "opacity-50" : ""}`}>
                <div className="hidden md:grid grid-cols-[2fr_2fr_100px_80px_100px_60px_140px] gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 border border-white/20 flex items-center justify-center shrink-0">
                      <span className="text-[7px] tracking-wider text-white/40">
                        {investor.name.split(" ").map(w => w[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-white/60">{investor.name}</span>
                      {investor.isSuspended && (
                        <span className="ml-2 text-[7px] tracking-[0.1em] text-red-400 border border-red-400/20 px-1">SUSPENDED</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/40">{investor.email}</span>
                  <span className="text-[10px] text-white/50">{"\u20B9"}{investor.balance.toLocaleString("en-IN")}</span>
                  <span className={`text-[8px] tracking-[0.1em] px-1.5 py-0.5 border w-fit ${
                    investor.kycStatus === "VERIFIED" ? "text-up border-up/20" :
                    investor.kycStatus === "PENDING" ? "text-amber-400 border-amber-400/20" :
                    "text-red-400 border-red-400/20"
                  }`}>{investor.kycStatus}</span>
                  <span className="text-[10px] text-white/50">{"\u20B9"}{investor.portfolioValue.toLocaleString("en-IN")}</span>
                  <span className="text-[10px] text-white/40">{investor.totalTrades}</span>
                  {topupTarget === investor.investorId ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={topupAmount}
                        onChange={e => setTopupAmount(e.target.value)}
                        placeholder="Amount"
                        className="w-16 bg-white/5 border border-white/15 px-1.5 py-1 text-[9px] text-white outline-none placeholder:text-white/20"
                        autoFocus
                        onKeyDown={async e => {
                          if (e.key === "Enter") {
                            const amt = parseFloat(topupAmount);
                            if (amt > 0) {
                              const res = await topupInvestor(investor.investorId, amt);
                              if (res.data) {
                                setInvestors(prev => prev.map(inv =>
                                  inv.investorId === investor.investorId
                                    ? { ...inv, balance: res.data!.new_balance }
                                    : inv
                                ));
                              }
                            }
                            setTopupTarget(null);
                            setTopupAmount("");
                          } else if (e.key === "Escape") {
                            setTopupTarget(null);
                            setTopupAmount("");
                          }
                        }}
                      />
                      <button
                        onClick={async () => {
                          const amt = parseFloat(topupAmount);
                          if (amt > 0) {
                            const res = await topupInvestor(investor.investorId, amt);
                            if (res.data) {
                              setInvestors(prev => prev.map(inv =>
                                inv.investorId === investor.investorId
                                  ? { ...inv, balance: res.data!.new_balance }
                                  : inv
                              ));
                            }
                          }
                          setTopupTarget(null);
                          setTopupAmount("");
                        }}
                        className="text-[8px] tracking-[0.1em] text-up border border-up/20 px-1.5 py-1 hover:bg-up/5"
                      >OK</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setTopupTarget(investor.investorId); setTopupAmount(""); }}
                      className="text-[8px] tracking-[0.1em] text-white/40 border border-white/10 px-2 py-1 hover:text-white/70 hover:border-white/25"
                    >TOPUP</button>
                  )}
                </div>
                <div className="md:hidden space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 border border-white/20 flex items-center justify-center shrink-0">
                        <span className="text-[6px] tracking-wider text-white/40">
                          {investor.name.split(" ").map(w => w[0]).join("")}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/60">{investor.name}</span>
                    </div>
                    <span className={`text-[7px] tracking-[0.1em] px-1 py-0.5 border ${
                      investor.kycStatus === "VERIFIED" ? "text-up border-up/20" :
                      investor.kycStatus === "PENDING" ? "text-amber-400 border-amber-400/20" :
                      "text-red-400 border-red-400/20"
                    }`}>{investor.kycStatus}</span>
                  </div>
                  <p className="text-[9px] text-white/30">{investor.email}</p>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/40">Balance: {"\u20B9"}{investor.balance.toLocaleString("en-IN")}</span>
                    <span className="text-white/30">{investor.totalTrades} trades</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      </>
    );
  }

  /* ——— NEWS TAB ——— */
  if (tab === "news") {
    const publishedNews = companyNews.filter((n) => n.status === "PUBLISHED");
    const rejectedNews = companyNews.filter((n) => n.status === "REJECTED");

    const statusBadge = (status: "PENDING" | "PUBLISHED" | "REJECTED") => {
      if (status === "PENDING") return <span className="text-[8px] tracking-[0.15em] text-amber-400 border border-amber-400/30 bg-amber-400/5 px-1.5 py-0.5 inline-flex items-center gap-1"><Clock size={8} />PENDING</span>;
      if (status === "PUBLISHED") return <span className="text-[8px] tracking-[0.15em] text-up border border-up/30 bg-up/5 px-1.5 py-0.5 inline-flex items-center gap-1"><CheckCircle size={8} />PUBLISHED</span>;
      return <span className="text-[8px] tracking-[0.15em] text-down border border-down/30 bg-down/5 px-1.5 py-0.5 inline-flex items-center gap-1"><XCircle size={8} />REJECTED</span>;
    };

    return (
      <>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="font-[var(--font-anton)] text-lg tracking-[0.08em]">COMPANY NEWS</h2>
          <p className="text-[10px] text-white/30 mt-0.5">{pendingNews.length} pending · {publishedNews.length} published · {rejectedNews.length} rejected</p>
        </motion.div>

        {/* Pending News */}
        {pendingNews.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-amber-400/20 mb-6">
            <div className="px-5 py-4 border-b border-amber-400/10 bg-amber-400/5">
              <p className="text-[9px] tracking-[0.15em] text-amber-400/80">PENDING APPROVAL ({pendingNews.length})</p>
            </div>
            {pendingNews.map((n, i) => (
              <div key={n.id} className={`px-5 py-4 ${i < pendingNews.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {statusBadge(n.status)}
                      <span className="text-[8px] tracking-[0.1em] text-white/20">{n.company}</span>
                    </div>
                    <h3 className="text-[13px] text-white/80 font-medium mb-1">{n.title}</h3>
                    <p className="text-[11px] text-white/40 leading-relaxed">{n.content}</p>
                    <p className="text-[9px] text-white/20 mt-2">{new Date(n.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approveNews(n.id)}
                      className="h-8 px-3 text-[9px] tracking-[0.1em] bg-up text-black font-semibold hover:bg-up/80 transition-colors"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => rejectNews(n.id)}
                      className="h-8 px-3 text-[9px] tracking-[0.1em] border border-down/40 text-down hover:bg-down/10 transition-colors"
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* All News */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="border border-white/10">
          <div className="px-5 py-4 border-b border-white/8">
            <p className="text-[9px] tracking-[0.15em] text-white/30">ALL NEWS ({companyNews.length})</p>
          </div>
          {companyNews.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Newspaper size={24} className="mx-auto text-white/10 mb-3" />
              <p className="text-[11px] text-white/25">No news articles yet</p>
            </div>
          ) : (
            companyNews.map((n, i) => (
              <div key={n.id} className={`px-5 py-4 ${i < companyNews.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  {statusBadge(n.status)}
                  <span className="text-[8px] tracking-[0.1em] text-white/20">{n.company}</span>
                </div>
                <h3 className="text-[13px] text-white/80 font-medium mb-1">{n.title}</h3>
                <p className="text-[11px] text-white/40 leading-relaxed">{n.content}</p>
                <p className="text-[9px] text-white/20 mt-2">{new Date(n.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            ))
          )}
        </motion.div>
      </>
    );
  }

  /* ——— EVENTS TAB ——— */
  if (tab === "events") {
    const sortedEvents = [...companyEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const upcoming = sortedEvents.filter((e) => new Date(e.date) >= new Date());
    const past = sortedEvents.filter((e) => new Date(e.date) < new Date());

    return (
      <>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="font-[var(--font-anton)] text-lg tracking-[0.08em]">COMPANY EVENTS</h2>
          <p className="text-[10px] text-white/30 mt-0.5">{upcoming.length} upcoming · {past.length} past</p>
        </motion.div>

        {/* Upcoming Events */}
        {upcoming.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-white/10 mb-6">
            <div className="px-5 py-4 border-b border-white/8">
              <p className="text-[9px] tracking-[0.15em] text-white/30">UPCOMING ({upcoming.length})</p>
            </div>
            {upcoming.map((evt, i) => (
              <div key={evt.id} className={`flex items-start gap-5 px-5 py-4 ${i < upcoming.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="shrink-0 w-14 text-center border border-white/10 py-2">
                  <p className="font-[var(--font-anton)] text-lg leading-none">{new Date(evt.date).getDate()}</p>
                  <p className="text-[8px] tracking-[0.15em] text-white/30 mt-1">{new Date(evt.date).toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={10} className="text-white/25" />
                    <span className="text-[8px] tracking-[0.1em] text-white/20">{evt.company}</span>
                  </div>
                  <h3 className="text-[13px] text-white/80 font-medium mb-1">{evt.title}</h3>
                  {evt.description && <p className="text-[11px] text-white/40 leading-relaxed">{evt.description}</p>}
                  <p className="text-[9px] text-white/20 mt-2">{new Date(evt.date).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
                <button
                  onClick={() => removeEvent(evt.id)}
                  className="shrink-0 p-2 text-white/20 hover:text-down transition-colors"
                  title="Remove event"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Past Events */}
        {past.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="border border-white/10">
            <div className="px-5 py-4 border-b border-white/8">
              <p className="text-[9px] tracking-[0.15em] text-white/30">PAST ({past.length})</p>
            </div>
            {past.map((evt, i) => (
              <div key={evt.id} className={`flex items-start gap-5 px-5 py-4 opacity-50 ${i < past.length - 1 ? "border-b border-white/6" : ""}`}>
                <div className="shrink-0 w-14 text-center border border-white/10 py-2">
                  <p className="font-[var(--font-anton)] text-lg leading-none">{new Date(evt.date).getDate()}</p>
                  <p className="text-[8px] tracking-[0.15em] text-white/30 mt-1">{new Date(evt.date).toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={10} className="text-white/25" />
                    <span className="text-[8px] tracking-[0.1em] text-white/20">{evt.company}</span>
                  </div>
                  <h3 className="text-[13px] text-white/80 font-medium mb-1">{evt.title}</h3>
                  {evt.description && <p className="text-[11px] text-white/40 leading-relaxed">{evt.description}</p>}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {companyEvents.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-white/10">
            <div className="px-5 py-12 text-center">
              <Calendar size={24} className="mx-auto text-white/10 mb-3" />
              <p className="text-[11px] text-white/25">No events scheduled</p>
            </div>
          </motion.div>
        )}
      </>
    );
  }

  /* ——— DASHBOARD (default) ——— */
  const displayedUsers = recentUsers.slice(0, 3);
  const displayedStocks = allStocksRaw.slice(0, 5);
  const displayedActivity = showAllActivity ? activityFeed : activityFeed.slice(0, 3);

  return (
    <>
      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-white/8 mb-8"
      >
        <div className="bg-bg p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users size={13} className="text-white/30" />
            <span className="text-[9px] tracking-[0.15em] text-white/25">TOTAL USERS</span>
          </div>
          <p className="font-[var(--font-anton)] text-xl">{stats.totalInvestors}</p>
          <p className="text-[10px] text-up mt-0.5">{stats.activeToday} active</p>
        </div>
        <div className="bg-bg p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={13} className="text-white/30" />
            <span className="text-[9px] tracking-[0.15em] text-white/25">TRADES</span>
          </div>
          <p className="font-[var(--font-anton)] text-xl">{stats.totalTrades.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-bg p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={13} className="text-white/30" />
            <span className="text-[9px] tracking-[0.15em] text-white/25">VOLUME</span>
          </div>
          <p className="font-[var(--font-anton)] text-xl">{"\u20B9"}{stats.totalVolume.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-bg p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={13} className="text-white/30" />
            <span className="text-[9px] tracking-[0.15em] text-white/25">LISTED</span>
          </div>
          <p className="font-[var(--font-anton)] text-xl">{listedStocks.length}</p>
        </div>
        <div className="bg-bg p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Power size={13} className={marketOpen ? "text-up" : "text-down"} />
            <span className="text-[9px] tracking-[0.15em] text-white/25">MARKET</span>
          </div>
          <p className={`font-[var(--font-anton)] text-xl ${marketOpen ? "text-up" : "text-down"}`}>
            {marketOpen ? "OPEN" : "CLOSED"}
          </p>
        </div>
      </motion.div>

      {/* Admin navigation tabs */}
      <div className="flex items-center gap-6 mb-6 overflow-x-auto scrollbar-hide border-b border-white/10 pb-0">
        {[
          { key: "", label: "DASHBOARD" },
          { key: "users", label: "USERS" },
          { key: "stocks", label: "STOCKS" },
          { key: "ledger", label: "LEDGER" },
          { key: "investors", label: "INVESTORS" },
          { key: "news", label: "NEWS" },
          { key: "events", label: "EVENTS" },
        ].map(({ key, label }) => {
          const isActive = (tab || "") === key;
          return (
            <Link
              key={key}
              href={key ? `/admin?tab=${key}` : "/admin"}
              className={`pb-3 text-[10px] tracking-[0.12em] font-medium whitespace-nowrap transition-colors duration-200 relative ${
                isActive ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />}
            </Link>
          );
        })}
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Col 1: Users */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="border border-white/10"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <p className="text-[9px] tracking-[0.15em] text-white/30">USERS</p>
            <Link href="/admin?tab=users" className="text-[9px] tracking-[0.1em] text-white/30 hover:text-white transition-colors">SEE ALL {"\u2192"}</Link>
          </div>
          {displayedUsers.map((user, i) => (
            <div
              key={user.email}
              className={`flex items-center justify-between px-5 py-3 ${
                i < displayedUsers.length - 1 ? "border-b border-white/6" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 border border-white/20 flex items-center justify-center shrink-0">
                  <span className="text-[7px] tracking-wider text-white/40">{user.name.split(" ").map(w => w[0]).join("")}</span>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.05em] text-white/60">{user.name}</p>
                  <p className="text-[8px] text-white/25">{user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-white/40">{user.trades} trades</p>
                {user.role !== "user" && (
                  <span className="text-[7px] tracking-[0.1em] text-white/25 border border-white/15 px-1 py-0.5">
                    {user.role === "company" ? "CO." : "ADM"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Col 2: Market Controls */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="space-y-6"
        >
          {/* Day/Tick Counter */}
          <DayTickCounter />

          {/* Market Status Toggle */}
          <div className="border border-white/10 p-5">
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-3">MARKET STATUS</p>
            <button
              onClick={toggleMarket}
              className={`w-full py-3 text-[10px] tracking-[0.15em] font-semibold border transition-all ${
                marketOpen
                  ? "bg-up/10 border-up/30 text-up hover:bg-up/20"
                  : "bg-down/10 border-down/30 text-down hover:bg-down/20"
              }`}
            >
              <Power size={14} className="inline mr-2 -mt-0.5" />
              {marketOpen ? "MARKET IS OPEN · CLICK TO CLOSE" : "MARKET IS CLOSED · CLICK TO OPEN"}
            </button>
          </div>

          {/* Listed Stocks */}
          <div className="border border-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <p className="text-[9px] tracking-[0.15em] text-white/30">LISTED STOCKS</p>
              <Link href="/admin?tab=stocks" className="text-[9px] tracking-[0.1em] text-white/30 hover:text-white transition-colors">SEE ALL {"\u2192"}</Link>
            </div>
            {displayedStocks.map((stock, i) => {
              const isListed = listedStocks.includes(stock.ticker);
              return (
                <div
                  key={stock.ticker}
                  className={`flex items-center justify-between px-5 py-3 ${
                    i < displayedStocks.length - 1 ? "border-b border-white/6" : ""
                  }`}
                >
                  <div>
                    <p className={`text-[11px] tracking-[0.05em] ${isListed ? "text-white/60" : "text-white/20 line-through"}`}>{stock.ticker}</p>
                    <p className="text-[9px] text-white/25">{stock.name}</p>
                  </div>
                  <button
                    onClick={() => toggleListing(stock.ticker)}
                    className={`flex items-center gap-1.5 text-[9px] tracking-[0.1em] px-2.5 py-1 border transition-all ${
                      isListed
                        ? "text-up border-up/20 hover:border-up/50"
                        : "text-down border-down/20 hover:border-down/50"
                    }`}
                  >
                    {isListed ? <Eye size={11} /> : <EyeOff size={11} />}
                    {isListed ? "LISTED" : "DELISTED"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Event Injection */}
          <EventInjectionForm />
          
          {/* Scandal Trigger */}
          <ScandalTrigger />
        </motion.div>

        {/* Col 3: Activity Feed + Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Activity Feed */}
          <div className="border border-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <p className="text-[9px] tracking-[0.15em] text-white/30">RECENT ACTIVITY</p>
              {activityFeed.length > 3 && (
                <button onClick={() => setShowAllActivity(!showAllActivity)} className="flex items-center gap-1 text-[9px] tracking-[0.1em] text-white/30 hover:text-white transition-colors">
                  {showAllActivity ? <><ChevronUp size={11} /> LESS</> : <><ChevronDown size={11} /> MORE</>}
                </button>
              )}
            </div>
            {displayedActivity.map((item, i) => (
              <div
                key={i}
                className={`px-5 py-3 ${i < displayedActivity.length - 1 ? "border-b border-white/6" : ""}`}
              >
                <span className={`text-[9px] tracking-[0.1em] font-semibold ${item.color}`}>{item.action}</span>
                <p className="text-[10px] text-white/40 mt-0.5">{item.detail}</p>
                <p className="text-[8px] text-white/15 mt-0.5">{item.time}</p>
              </div>
            ))}
          </div>

          {/* Announcements */}
          <div className="border border-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Megaphone size={13} className="text-white/30" />
                <p className="text-[9px] tracking-[0.15em] text-white/30">ANNOUNCEMENTS</p>
              </div>
              <button
                onClick={() => setShowAnnForm(!showAnnForm)}
                className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] text-white/40 hover:text-white transition-colors"
              >
                <Plus size={12} /> NEW
              </button>
            </div>
            {showAnnForm && (
              <div className="px-5 py-4 border-b border-white/8 space-y-3">
                <input
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20"
                />
                <textarea
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Content..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 resize-none"
                />
                <button
                  onClick={publishAnnouncement}
                  className="px-4 py-2 bg-white text-black text-[10px] tracking-[0.1em] font-semibold hover:bg-white/90 transition-colors"
                >
                  PUBLISH
                </button>
              </div>
            )}
            {announcements.map((a, i) => (
              <div key={a.id} className={`px-5 py-3 ${i < announcements.length - 1 ? "border-b border-white/6" : ""}`}>
                <p className="text-[11px] text-white/60">{a.title}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{a.content}</p>
                <p className="text-[8px] text-white/15 mt-1">{new Date(a.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Phase 15 — System Health Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="mt-8 border border-white/10"
      >
        <div className="px-5 py-4 border-b border-white/8">
          <p className="text-[9px] tracking-[0.15em] text-white/30">SYSTEM HEALTH</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-white/8">
          <div className="bg-bg px-5 py-4">
            <p className="text-[8px] tracking-[0.1em] text-white/25 mb-1">WS CONNECTIONS</p>
            <p className="font-[var(--font-anton)] text-lg">{stats.connectedWsUsers}</p>
          </div>
          <div className="bg-bg px-5 py-4">
            <p className="text-[8px] tracking-[0.1em] text-white/25 mb-1">ORDERS / MIN</p>
            <p className="font-[var(--font-anton)] text-lg">{stats.orderRatePerMin}</p>
          </div>
          <div className="bg-bg px-5 py-4">
            <p className="text-[8px] tracking-[0.1em] text-white/25 mb-1">LLM P50 / P99</p>
            <p className="font-[var(--font-anton)] text-lg">
              {stats.llmLatencyP50 > 0
                ? `${(stats.llmLatencyP50 / 1000).toFixed(0)}s / ${(stats.llmLatencyP99 / 1000).toFixed(0)}s`
                : "—"}
            </p>
          </div>
          <div className="bg-bg px-5 py-4">
            <p className="text-[8px] tracking-[0.1em] text-white/25 mb-1">REDIS HIT RATE</p>
            <p className="font-[var(--font-anton)] text-lg">
              {stats.redisHitRate > 0 ? `${(stats.redisHitRate * 100).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="bg-bg px-5 py-4">
            <p className="text-[8px] tracking-[0.1em] text-white/25 mb-1">MACRO TICK DUR.</p>
            <p className="font-[var(--font-anton)] text-lg">
              {stats.macroTickDurationSecs != null ? `${stats.macroTickDurationSecs.toFixed(0)}s` : "—"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Pending News Approvals */}
      {pendingNews.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-8 border border-white/10"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Newspaper size={13} className="text-amber-400/50" />
              <p className="text-[9px] tracking-[0.15em] text-amber-400/60">PENDING NEWS APPROVAL ({pendingNews.length})</p>
            </div>
            <Link href="/admin?tab=news" className="text-[9px] tracking-[0.1em] text-white/40 hover:text-white transition-colors">
              VIEW ALL {"\u2192"}
            </Link>
          </div>
          {pendingNews.map((n) => (
            <div key={n.id} className="flex items-center justify-between px-5 py-3 border-b border-white/6 last:border-b-0">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[8px] tracking-[0.1em] text-white/20">{n.company}</span>
                </div>
                <p className="text-[11px] text-white/60">{n.title}</p>
                <p className="text-[9px] text-white/25 mt-0.5">{new Date(n.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => approveNews(n.id)}
                  className="h-7 px-3 text-[8px] tracking-[0.1em] bg-up text-black font-semibold hover:bg-up/80 transition-colors"
                >
                  APPROVE
                </button>
                <button
                  onClick={() => rejectNews(n.id)}
                  className="h-7 px-3 text-[8px] tracking-[0.1em] border border-down/40 text-down hover:bg-down/10 transition-colors"
                >
                  REJECT
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Main Admin Page
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function AdminPage() {
  const { isLoggedIn, role, userName } = useAuth();

  if (!isLoggedIn || !role || role === "user") {
    return (
      <div className="pb-24 md:pb-12 py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <AlertTriangle size={32} className="text-white/20 mb-4" />
          <p className="font-[var(--font-anton)] text-lg tracking-[0.1em] mb-2">ACCESS DENIED</p>
          <p className="text-[11px] text-white/40 mb-6">You need admin privileges to access this page.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-12 py-6 md:py-8">
      {/* Header (totalAdmin only â€” companyAdmin has its own header) */}
      {role === "admin" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          <Shield size={18} className="text-white/40" />
          <div>
            <h1 className="font-[var(--font-anton)] text-xl md:text-2xl tracking-[0.08em] uppercase">ADMIN DASHBOARD</h1>
            <p className="text-[10px] text-white/30 mt-0.5">Logged in as {userName}</p>
          </div>
        </motion.div>
      )}

      {role === "company" ? <EnigmaDashboard /> : <Suspense><TotalAdminDashboard /></Suspense>}
    </div>
  );
}
