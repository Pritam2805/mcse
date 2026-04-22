"use client";

import { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, ChevronDown, ChevronUp, BarChart3, ArrowUpDown, Minus, Plus, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sparkline from "@/components/Sparkline";
import Link from "next/link";
import LoginPrompt from "@/components/LoginPrompt";
import { useAuth } from "@/lib/AuthContext";
import { useTrading } from "@/lib/TradingContext";
import { usePreferences } from "@/lib/PreferencesContext";
import OrderConfirmModal from "@/components/OrderConfirmModal";
import { getIntradayPositions, getPortfolio, type IntradayPosition, type PortfolioHolding } from "@/lib/api";
import { stockDirectory } from "@/lib/mockData";

type SortKey = "ticker" | "currentPrice" | "returnsPercent" | "currentValue";
type SortDir = "asc" | "desc";

export default function HoldingsPage() {
  const { isLoggedIn } = useAuth();
  const { transactions, balance, placeOrder } = useTrading();
  const { confirmOrders } = usePreferences();
  const [showValues, setShowValues] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("currentValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [sortOpen, setSortOpen] = useState(false);
  const [mobileDisplay, setMobileDisplay] = useState<"market" | "current" | "returns" | "dayChange">("market");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [buySellTab, setBuySellTab] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"DELIVERY" | "INTRADAY">("DELIVERY");
  const [qty, setQty] = useState(1);
  const [pricingType, setPricingType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [orderMsg, setOrderMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [intradayPositions, setIntradayPositions] = useState<IntradayPosition[]>([]);
  const [loadingIntraday, setLoadingIntraday] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [apiBalance, setApiBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    getIntradayPositions().then(res => {
      if (res.data) setIntradayPositions(res.data);
      setLoadingIntraday(false);
    });
    getPortfolio().then(res => {
      if (res.data) {
        setPortfolio(res.data.holdings);
        setApiBalance(res.data.balance);
      }
    });
  }, [isLoggedIn]);

  // Merge real portfolio with mock stock data for the trading panel
  const holdings = useMemo(() => portfolio.map(h => ({
    ticker: h.ticker,
    name: h.name,
    qty: h.quantity,
    avgPrice: h.avg_price,
    currentPrice: h.current_price ?? h.avg_price,
    currentValue: (h.current_price ?? h.avg_price) * h.quantity,
    investedValue: h.avg_price * h.quantity,
    returnsPercent: h.current_price !== null
      ? ((h.current_price - h.avg_price) / h.avg_price) * 100 : 0,
    returns: h.pnl ?? 0,
    dayChangePercent: 0,
    dayChange: 0,
    sparkline: [] as number[],
  })), [portfolio]);

  const investments = useMemo(() => {
    const currentValue  = holdings.reduce((s, h) => s + h.currentValue,  0);
    const investedValue = holdings.reduce((s, h) => s + h.investedValue, 0);
    const totalReturns  = currentValue - investedValue;
    return {
      currentValue,
      investedValue,
      totalReturns,
      totalReturnsPercent: investedValue > 0 ? (totalReturns / investedValue) * 100 : 0,
      dayReturns: 0,
    };
  }, [holdings]);

  const sorted = useMemo(() => {
    const arr = [...holdings];
    arr.sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "ticker")       { av = a.ticker; bv = b.ticker; }
      else if (sortKey === "currentPrice")  { av = a.currentPrice; bv = b.currentPrice; }
      else if (sortKey === "returnsPercent"){ av = a.returnsPercent; bv = b.returnsPercent; }
      else                            { av = a.currentValue; bv = b.currentValue; }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [holdings, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function sortIcon(col: SortKey) {
    return sortKey === col
      ? sortDir === "asc" ? <ChevronUp size={10} className="inline ml-0.5" /> : <ChevronDown size={10} className="inline ml-0.5" />
      : <ChevronDown size={10} className="inline ml-0.5 opacity-30" />;
  }

  const displayBalance = apiBalance ?? balance;
  const recentTxns = transactions.filter(t => t.type === "BUY" || t.type === "SELL").slice(0, 5);

  const selectedStock = selectedTicker ? stockDirectory[selectedTicker] : null;
  const selectedHolding = selectedTicker ? holdings.find(h => h.ticker === selectedTicker) : null;

  const effectivePrice = pricingType === "LIMIT" && limitPrice ? parseFloat(limitPrice) : (selectedStock?.price ?? 0);

  function executeOrder() {
    if (!selectedStock) return;
    const result = placeOrder({
      ticker: selectedStock.ticker,
      name: selectedStock.name,
      type: buySellTab,
      orderType,
      qty,
      price: selectedStock.price,
      pricingType,
      ...(pricingType === "LIMIT" && limitPrice ? { limitPrice: parseFloat(limitPrice) } : {}),
    });
    setOrderMsg({ ok: result.success, text: result.message });
    if (result.success) { setQty(1); setLimitPrice(""); }
    setTimeout(() => setOrderMsg(null), 3000);
  }

  function handleOrder() {
    if (confirmOrders) {
      setConfirmOpen(true);
    } else {
      executeOrder();
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="py-6">
        <LoginPrompt message="Log in to view and manage your stock holdings." />
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-[var(--font-anton)] text-lg md:text-xl tracking-[0.1em] uppercase">
          HOLDINGS ({holdings.length})
        </h1>
        <button
          onClick={() => setShowValues(!showValues)}
          className="w-10 h-10 border border-white/20 flex items-center justify-center hover:border-white transition-colors duration-300"
        >
          {showValues ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <Link
          href="/analyse"
          className="ml-auto flex items-center gap-2 px-4 py-2 border border-white/20 text-[10px] tracking-[0.15em] text-white/50 hover:text-white hover:border-white transition-all duration-300"
        >
          <BarChart3 size={13} />
          ANALYSE
        </Link>
      </div>

      {/* Mobile: Portfolio summary — Groww-style */}
      <div
        className="lg:hidden border border-white/10 p-5 mb-6"
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1">CURRENT VALUE</p>
            <p className="font-[var(--font-anton)] text-2xl tracking-tight">
              {showValues ? `\u20B9${investments.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "\u20B9 \u2022\u2022\u2022\u2022\u2022\u2022"}
            </p>
            <p className={`text-[12px] font-medium mt-1 ${investments.totalReturns >= 0 ? "text-up" : "text-down"}`}>
              {showValues ? (
                <>{investments.totalReturns >= 0 ? "+" : ""}{"\u20B9"}{Math.abs(investments.totalReturns).toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({investments.totalReturnsPercent.toFixed(2)}%)</>
              ) : (
                <>{investments.totalReturnsPercent >= 0 ? "+" : ""}{investments.totalReturnsPercent.toFixed(2)}%</>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/6">
            <div>
              <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1">INVESTED</p>
              <p className="font-[var(--font-anton)] text-base tracking-tight text-white/60">
                {showValues ? `\u20B9${investments.investedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "\u20B9 \u2022\u2022\u2022\u2022\u2022\u2022"}
              </p>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1">1D RETURNS</p>
              <p className={`font-[var(--font-anton)] text-base tracking-tight ${investments.dayReturns >= 0 ? "text-up" : "text-down"}`}>
                {showValues ? `${investments.dayReturns >= 0 ? "+" : ""}\u20B9${Math.abs(investments.dayReturns).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "\u2022\u2022\u2022"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop 2-column grid */}
      <div className="lg:grid lg:grid-cols-[13fr_7fr] lg:gap-8">
        {/* Left column: Holdings list */}
        <div>

        {/* Desktop: Portfolio summary strip (above table) */}
        <div className="hidden lg:flex items-center gap-8 border border-white/10 p-5 mb-6">
          <div className="flex-1">
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1">CURRENT VALUE</p>
            <p className="font-[var(--font-anton)] text-2xl tracking-tight">
              {showValues ? `\u20B9${investments.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "\u20B9 \u2022\u2022\u2022\u2022\u2022\u2022"}
            </p>
            <p className={`text-[12px] font-medium mt-1 ${investments.totalReturns >= 0 ? "text-up" : "text-down"}`}>
              {showValues ? (
                <>{investments.totalReturns >= 0 ? "+" : ""}{"\u20B9"}{Math.abs(investments.totalReturns).toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({investments.totalReturnsPercent.toFixed(2)}%)</>
              ) : (
                <>{investments.totalReturnsPercent >= 0 ? "+" : ""}{investments.totalReturnsPercent.toFixed(2)}%</>
              )}
            </p>
          </div>
          <div className="border-l border-white/8 pl-8">
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1">INVESTED</p>
            <p className="font-[var(--font-anton)] text-lg tracking-tight text-white/60">
              {showValues ? `\u20B9${investments.investedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "\u20B9 \u2022\u2022\u2022\u2022\u2022\u2022"}
            </p>
          </div>
          <div className="border-l border-white/8 pl-8">
            <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1">1D RETURNS</p>
            <p className={`font-[var(--font-anton)] text-lg tracking-tight ${investments.dayReturns >= 0 ? "text-up" : "text-down"}`}>
              {showValues ? `${investments.dayReturns >= 0 ? "+" : ""}\u20B9${investments.dayReturns.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "\u2022\u2022\u2022"}
            </p>
          </div>
        </div>

        {/* Mobile: Card list */}
        <div className="lg:hidden">
          <div className="flex items-center gap-3 mb-3 relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 text-[10px] tracking-[0.1em] text-white/60 hover:text-white hover:border-white transition-colors"
            >
              <ArrowUpDown size={11} />
              SORT
            </button>
            {sortOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 border border-white/15 bg-bg min-w-[140px]">
                {(["ticker", "currentPrice", "returnsPercent", "currentValue"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setSortKey(key); setSortDir("desc"); setSortOpen(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-[10px] tracking-[0.1em] transition-colors ${sortKey === key ? "text-white bg-white/[0.06]" : "text-white/50 hover:text-white hover:bg-white/[0.03]"}`}
                  >
                    {{ ticker: "NAME", currentPrice: "PRICE", returnsPercent: "RETURNS", currentValue: "VALUE" }[key]}
                  </button>
                ))}
              </div>
            )}
            <span className="text-[9px] tracking-[0.1em] text-white/25 ml-auto">
              VALUE
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                setMobileDisplay((d) => {
                  const order: typeof mobileDisplay[] = ["market", "current", "returns", "dayChange"];
                  return order[(order.indexOf(d) + 1) % order.length];
                });
              }}
              className="px-3 py-1.5 border border-white/15 text-[10px] tracking-[0.1em] text-white/60 hover:text-white hover:border-white transition-colors"
            >
              {{ market: "MKT PRICE", current: "CURRENT", returns: "RETURNS", dayChange: "1D CHG" }[mobileDisplay]}
            </button>
          </div>
          <div className="space-y-2">
          {sorted.map((h) => (
            <div
              key={h.ticker}
            >
              <Link
                href={`/stock/${h.ticker}`}
                className="flex items-center justify-between bg-white/[0.02] border border-white/6 p-4 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{h.ticker}</p>
                    <p className="text-[10px] text-white/30 truncate">{h.name}</p>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">
                    {showValues ? <>{h.qty} shares · Avg {"\u20B9"}{h.avgPrice.toFixed(2)}</> : <>{h.qty > 0 ? "\u2022\u2022\u2022" : ""}</>}
                  </p>
                </div>
                <div className="shrink-0 mx-3">
                  <Sparkline data={h.sparkline} width={44} height={16} positive={h.dayChangePercent >= 0} />
                </div>
                <div className="text-right shrink-0">
                  {mobileDisplay === "market" && (
                    <>
                      <p className="font-[var(--font-anton)] text-[13px]">
                        {"\u20B9"}{h.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-[11px] font-medium ${h.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>
                        {h.dayChangePercent >= 0 ? "+" : ""}{h.dayChangePercent.toFixed(2)}%
                      </p>
                    </>
                  )}
                  {mobileDisplay === "current" && (
                    <>
                      <p className="font-[var(--font-anton)] text-[13px]">
                        {showValues ? `\u20B9${h.currentValue.toLocaleString("en-IN")}` : "\u2022\u2022\u2022\u2022"}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {showValues ? `Inv \u20B9${h.investedValue.toLocaleString("en-IN")}` : "\u2022\u2022\u2022\u2022"}
                      </p>
                    </>
                  )}
                  {mobileDisplay === "returns" && (
                    <>
                      <p className={`font-[var(--font-anton)] text-[13px] ${h.returnsPercent >= 0 ? "text-up" : "text-down"}`}>
                        {h.returnsPercent >= 0 ? "+" : ""}{h.returnsPercent.toFixed(2)}%
                      </p>
                      <p className={`text-[10px] ${h.returns >= 0 ? "text-up/60" : "text-down/60"}`}>
                        {showValues ? `${h.returns >= 0 ? "+" : ""}\u20B9${h.returns.toLocaleString("en-IN")}` : "\u2022\u2022\u2022"}
                      </p>
                    </>
                  )}
                  {mobileDisplay === "dayChange" && (
                    <>
                      <p className={`font-[var(--font-anton)] text-[13px] ${h.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>
                        {h.dayChangePercent >= 0 ? "+" : ""}{h.dayChangePercent.toFixed(2)}%
                      </p>
                      <p className={`text-[10px] ${h.dayChange >= 0 ? "text-up/60" : "text-down/60"}`}>
                        {h.dayChange >= 0 ? "+" : ""}{"\u20B9"}{h.dayChange.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              </Link>
            </div>
          ))}
          </div>
        </div>

        {/* Desktop: Table with sortable headers */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-[1fr_80px_100px_100px_120px] gap-4 px-4 py-2 border-b border-white/12">
            <button onClick={() => toggleSort("ticker")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-left hover:text-white transition-colors">
              COMPANY {sortIcon("ticker")}
            </button>
            <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right">TREND</span>
            <button onClick={() => toggleSort("currentPrice")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right hover:text-white transition-colors">
              MKT PRICE {sortIcon("currentPrice")}
            </button>
            <button onClick={() => toggleSort("returnsPercent")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right hover:text-white transition-colors">
              RETURNS {sortIcon("returnsPercent")}
            </button>
            <button onClick={() => toggleSort("currentValue")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right hover:text-white transition-colors">
              CURRENT {sortIcon("currentValue")}
            </button>
          </div>

          {sorted.map((h) => (
            <div
              key={h.ticker}
              onClick={() => { setSelectedTicker(h.ticker); setQty(1); setOrderMsg(null); }}
              className={`grid grid-cols-[1fr_80px_100px_100px_120px] gap-4 px-4 py-3 border-b border-white/6 hover:bg-white/[0.04] transition-colors duration-300 items-center cursor-pointer ${selectedTicker === h.ticker ? "bg-white/[0.06]" : ""}`}
            >
              <div>
                <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{h.ticker}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{h.name}{showValues ? <> · {h.qty} shares · Avg {"\u20B9"}{h.avgPrice.toFixed(2)}</> : null}</p>
              </div>
              <div className="flex justify-end">
                <Sparkline data={h.sparkline} width={60} height={20} positive={h.dayChangePercent >= 0} />
              </div>
              <div className="text-right">
                <p className="font-[var(--font-anton)] text-[13px]">
                  {"\u20B9"}{h.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className={`text-[10px] font-medium ${h.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>
                  {h.dayChangePercent >= 0 ? "+" : ""}{h.dayChangePercent.toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <p className={`font-[var(--font-anton)] text-[13px] ${h.returnsPercent >= 0 ? "text-up" : "text-down"}`}>
                  {h.returnsPercent >= 0 ? "+" : ""}{h.returnsPercent.toFixed(2)}%
                </p>
                <p className="text-[10px] text-white/30">
                  {showValues ? `${h.returns >= 0 ? "+" : ""}\u20B9${h.returns.toLocaleString("en-IN")}` : "\u2022\u2022\u2022\u2022"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-[var(--font-anton)] text-[13px]">
                  {showValues ? `\u20B9${h.currentValue.toLocaleString("en-IN")}` : "\u2022\u2022\u2022\u2022"}
                </p>
                <p className="text-[10px] text-white/30">
                  {showValues ? `\u20B9${h.investedValue.toLocaleString("en-IN")}` : "\u2022\u2022\u2022\u2022"}
                </p>
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* Right sidebar (desktop): Order panel + Transactions */}
        <aside className="hidden lg:block space-y-6">
          {/* Order panel — shown when a holding is selected */}
          {selectedStock && (
            <div className="border border-white/10 p-5">
              {/* Order feedback toast */}
              <AnimatePresence>
                {orderMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`mb-4 p-3 border text-[10px] tracking-[0.1em] ${orderMsg.ok ? "border-up/30 text-up bg-up/5" : "border-down/30 text-down bg-down/5"}`}
                  >
                    {orderMsg.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stock header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-[var(--font-anton)] text-[15px] tracking-[0.05em]">{selectedStock.ticker}</p>
                  <p className="text-[10px] text-white/40">{selectedStock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-[var(--font-anton)] text-[15px]">{"\u20B9"}{selectedStock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  <p className={`text-[10px] font-medium ${selectedStock.changePercent >= 0 ? "text-up" : "text-down"}`}>
                    {selectedStock.changePercent >= 0 ? "+" : ""}{selectedStock.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Holding info */}
              {selectedHolding && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-white/[0.03] border border-white/6">
                  <div>
                    <p className="text-[8px] tracking-[0.1em] text-white/25">QTY HELD</p>
                    <p className="text-[12px] font-[var(--font-anton)]">{selectedHolding.qty}</p>
                  </div>
                  <div>
                    <p className="text-[8px] tracking-[0.1em] text-white/25">AVG PRICE</p>
                    <p className="text-[12px] font-[var(--font-anton)]">{"\u20B9"}{selectedHolding.avgPrice.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {/* BUY / SELL tabs */}
              <div className="flex gap-0 mb-4">
                <button
                  onClick={() => setBuySellTab("BUY")}
                  className={`flex-1 py-2 text-[10px] tracking-[0.15em] font-medium border-b-2 transition-all duration-300 ${buySellTab === "BUY" ? "text-up border-up bg-up/10" : "text-white/40 border-transparent hover:text-white/60"}`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setBuySellTab("SELL")}
                  className={`flex-1 py-2 text-[10px] tracking-[0.15em] font-medium border-b-2 transition-all duration-300 ${buySellTab === "SELL" ? "text-down border-down bg-down/10" : "text-white/40 border-transparent hover:text-white/60"}`}
                >
                  SELL
                </button>
              </div>

              {/* Order type */}
              <div className="flex gap-0 mb-4">
                {(["DELIVERY", "INTRADAY"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`px-3 py-1.5 text-[9px] tracking-[0.15em] border-b-2 transition-all ${orderType === t ? "text-white border-white" : "text-white/40 border-transparent hover:text-white/60"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] tracking-[0.15em] text-white/30">PRICE</p>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pricingType === "MARKET"}
                      onChange={(e) => {
                        if (e.target.checked) { setPricingType("MARKET"); setLimitPrice(""); }
                        else { setPricingType("LIMIT"); setLimitPrice(selectedStock.price.toFixed(2)); }
                      }}
                      className="w-3 h-3 accent-white"
                    />
                    <span className="text-[9px] tracking-[0.15em] text-white/50">MARKET</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={pricingType === "MARKET" ? selectedStock.price.toFixed(2) : limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  disabled={pricingType === "MARKET"}
                  placeholder={selectedStock.price.toFixed(2)}
                  className={`w-full h-10 bg-transparent border px-4 text-center font-[var(--font-anton)] text-[14px] text-white outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    pricingType === "MARKET" ? "text-white/40 border-white/10 cursor-not-allowed" : "border-white/20 focus:border-white"
                  }`}
                />
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1.5">QUANTITY</p>
                <div className="flex items-center border border-white/15">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors">
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-10 text-center bg-transparent text-[14px] font-[var(--font-anton)] outline-none border-x border-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Est total */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] tracking-[0.15em] text-white/30">EST. TOTAL</p>
                <p className="font-[var(--font-anton)] text-[15px]">{"\u20B9"}{(effectivePrice * qty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/8">
                <p className="text-[9px] tracking-[0.15em] text-white/30">BALANCE</p>
                <p className="text-[11px] text-white/50">{"\u20B9"}{displayBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Action button */}
              <button
                onClick={handleOrder}
                className={`w-full py-3 text-[11px] tracking-[0.2em] font-medium transition-all hover:opacity-90 ${
                  buySellTab === "BUY"
                    ? "bg-up text-black"
                    : "bg-down text-white"
                }`}
              >
                {pricingType === "LIMIT" ? `${buySellTab} LIMIT` : buySellTab} {selectedStock.ticker}
              </button>

              {/* View detail link */}
              <Link
                href={`/stock/${selectedStock.ticker}`}
                className="block mt-3 text-[10px] tracking-[0.1em] text-white/30 hover:text-white transition-colors text-center"
              >
                VIEW STOCK DETAILS
              </Link>
            </div>
          )}

          {/* Placeholder when no stock selected */}
          {!selectedStock && (
            <div className="border border-white/10 p-5 flex items-center justify-center min-h-[120px]">
              <p className="text-[10px] tracking-[0.1em] text-white/20 text-center">SELECT A HOLDING<br />TO TRADE</p>
            </div>
          )}

          {/* Intraday Positions */}
          <div className="border border-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-amber-400/60" />
                <p className="text-[9px] tracking-[0.15em] text-white/30">INTRADAY POSITIONS</p>
              </div>
              {intradayPositions.length > 0 && (
                <span className="text-[8px] tracking-[0.1em] text-amber-400/60 border border-amber-400/20 px-1.5 py-0.5 bg-amber-400/5">
                  {intradayPositions.length} OPEN
                </span>
              )}
            </div>
            {loadingIntraday ? (
              <div className="px-5 py-6 text-center">
                <p className="text-[10px] text-white/20 animate-pulse">Loading...</p>
              </div>
            ) : intradayPositions.length > 0 ? (
              <div className="divide-y divide-white/6">
                {intradayPositions.map((pos, idx) => {
                  const isProfit = pos.unrealizedPnl >= 0;
                  return (
                    <div key={pos.ticker + idx} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] tracking-[0.1em] font-semibold px-1.5 py-0.5 border text-blue-400 border-blue-400/30 bg-blue-400/5">
                            INTRADAY
                          </span>
                          <span className="text-[11px] font-medium text-white/70">{pos.ticker}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isProfit ? (
                            <TrendingUp size={11} className="text-up" />
                          ) : (
                            <TrendingDown size={11} className="text-down" />
                          )}
                          <span className={`text-[11px] font-[var(--font-anton)] ${isProfit ? "text-up" : "text-down"}`}>
                            {isProfit ? "+" : ""}{showValues ? `₹${pos.unrealizedPnl.toFixed(0)}` : "•••"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-white/30">
                        <span>{pos.qty} × ₹{pos.entryPrice.toFixed(2)}</span>
                        <span className={isProfit ? "text-up/60" : "text-down/60"}>
                          {isProfit ? "+" : ""}{pos.unrealizedPnlPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-6 text-center">
                <p className="text-[10px] text-white/20">No open intraday positions</p>
                <p className="text-[9px] text-white/15 mt-1">Positions auto-close at market end</p>
              </div>
            )}
          </div>

          {/* Recent transactions */}
          {recentTxns.length > 0 && (
            <div className="border border-white/10 p-5">
              <p className="text-[9px] tracking-[0.15em] text-white/30 mb-3">RECENT ACTIVITY</p>
              <div className="space-y-2">
                {recentTxns.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] tracking-[0.1em] font-semibold px-1.5 py-0.5 border ${
                        txn.type === "BUY"
                          ? "text-up border-up/30 bg-up/5"
                          : "text-down border-down/30 bg-down/5"
                      }`}>
                        {txn.type}
                      </span>
                      <span className="text-[10px] text-white/40">{txn.ticker}</span>
                    </div>
                    <span className="text-[10px] font-[var(--font-anton)]">{"\u20B9"}{Math.abs(txn.amount).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>



      {/* Order confirm modal */}
      {selectedStock && (
        <OrderConfirmModal
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); executeOrder(); }}
          type={buySellTab}
          ticker={selectedStock.ticker}
          qty={qty}
          price={effectivePrice}
          pricingType={pricingType}
          total={effectivePrice * qty}
        />
      )}
    </div>
  );
}
