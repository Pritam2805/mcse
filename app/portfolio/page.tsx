"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ChevronDown, ChevronUp, BarChart3, ArrowUpDown, Minus, Plus, Clock, TrendingUp, TrendingDown } from "lucide-react";
import Sparkline from "@/components/Sparkline";
import LoginPrompt from "@/components/LoginPrompt";
import OrderConfirmModal from "@/components/OrderConfirmModal";
import { useAuth } from "@/lib/AuthContext";
import { useTrading } from "@/lib/TradingContext";
import { usePreferences } from "@/lib/PreferencesContext";
import { useWebSocket } from "@/lib/WebSocketContext";
import { getIntradayPositions, getPortfolio, type IntradayPosition, type PortfolioHolding } from "@/lib/api";
import { stockDirectory, type StockInfo } from "@/lib/mockData";
import { usePoll } from "@/lib/usePoll";

type SortKey = "ticker" | "currentPrice" | "returnsPercent" | "currentValue";
type SortDir = "asc" | "desc";
type SubTab = "holdings" | "orders";

export default function PortfolioPage() {
  return (
    <Suspense>
      <PortfolioInner />
    </Suspense>
  );
}

function PortfolioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const subTab: SubTab = rawTab === "orders" ? "orders" : "holdings";

  function setSubTab(t: SubTab) {
    const qs = t === "orders" ? "?tab=orders" : "";
    router.replace(`/portfolio${qs}`, { scroll: false });
  }

  const { isLoggedIn } = useAuth();
  const { transactions, balance, placeOrder, orders } = useTrading();
  const { confirmOrders } = usePreferences();
  const { marketTicks, subscribe, unsubscribe } = useWebSocket();

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

  usePoll(async () => {
    if (!isLoggedIn) return;
    const [iRes, pRes] = await Promise.all([getIntradayPositions(), getPortfolio()]);
    if (iRes.data) setIntradayPositions(iRes.data);
    setLoadingIntraday(false);
    if (pRes.data) {
      setPortfolio(pRes.data.holdings);
      setApiBalance(pRes.data.balance);
    }
  }, 5000);

  // Subscribe to live market ticks for every held ticker so prices/P&L update in real time
  useEffect(() => {
    const tickers = portfolio.map(h => h.ticker);
    tickers.forEach(t => subscribe(`market:${t}`));
    return () => { tickers.forEach(t => unsubscribe(`market:${t}`)); };
  }, [portfolio, subscribe, unsubscribe]);

  // Merge portfolio with live ticks — when a ticker arrives on the WS, it overrides the polled price
  const holdings = useMemo(() => portfolio.map(h => {
    const live = marketTicks[h.ticker];
    const currentPrice = live?.price ?? h.current_price ?? h.avg_price;
    const dayChangePercent = live?.changePercent ?? 0;
    const dayChange = live?.change ?? 0;
    const currentValue = currentPrice * h.quantity;
    const investedValue = h.avg_price * h.quantity;
    const returns = currentValue - investedValue;
    return {
      ticker: h.ticker,
      name: h.name,
      qty: h.quantity,
      avgPrice: h.avg_price,
      currentPrice,
      currentValue,
      investedValue,
      returnsPercent: h.avg_price > 0 ? (returns / investedValue) * 100 : 0,
      returns,
      dayChangePercent,
      dayChange,
      sparkline: [] as number[],
    };
  }), [portfolio, marketTicks]);

  const investments = useMemo(() => {
    const currentValue  = holdings.reduce((s, h) => s + h.currentValue,  0);
    const investedValue = holdings.reduce((s, h) => s + h.investedValue, 0);
    const totalReturns  = currentValue - investedValue;
    const dayReturns    = holdings.reduce((s, h) => s + h.dayChange * h.qty, 0);
    return {
      currentValue,
      investedValue,
      totalReturns,
      totalReturnsPercent: investedValue > 0 ? (totalReturns / investedValue) * 100 : 0,
      dayReturns,
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
  // Order panel should also react to live ticks for the selected ticker
  const selectedLivePrice = selectedTicker
    ? (marketTicks[selectedTicker]?.price ?? selectedStock?.price ?? 0)
    : 0;

  const effectivePrice = pricingType === "LIMIT" && limitPrice ? parseFloat(limitPrice) : selectedLivePrice;

  async function executeOrder() {
    if (!selectedStock) return;
    const result = await placeOrder({
      ticker: selectedStock.ticker,
      name: selectedStock.name,
      type: buySellTab,
      orderType,
      qty,
      price: selectedLivePrice,
      pricingType,
      ...(pricingType === "LIMIT" && limitPrice ? { limitPrice: parseFloat(limitPrice) } : {}),
    });
    setOrderMsg({ ok: result.success, text: result.message });
    if (result.success) { setQty(1); setLimitPrice(""); }
    setTimeout(() => setOrderMsg(null), 3000);
  }

  function handleOrder() {
    if (confirmOrders) setConfirmOpen(true);
    else executeOrder();
  }

  if (!isLoggedIn) {
    return (
      <div className="py-6">
        <LoginPrompt message="Log in to view your portfolio, holdings and order history." />
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Page title + subtabs */}
      <div className="flex items-center gap-3 mb-2">
        <h1 className="font-[var(--font-anton)] text-lg md:text-xl tracking-[0.1em] uppercase">
          PORTFOLIO
        </h1>
        {subTab === "holdings" && (
          <button
            onClick={() => setShowValues(!showValues)}
            className="w-10 h-10 border border-white/20 flex items-center justify-center hover:border-white transition-colors duration-300"
            aria-label={showValues ? "Hide values" : "Show values"}
          >
            {showValues ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        )}
        {subTab === "holdings" && (
          <Link
            href="/analyse"
            className="ml-auto flex items-center gap-2 px-4 py-2 border border-white/20 text-[10px] tracking-[0.15em] text-white/50 hover:text-white hover:border-white transition-all duration-300"
          >
            <BarChart3 size={13} />
            ANALYSE
          </Link>
        )}
      </div>

      {/* Sub-tabs: HOLDINGS | ORDER HISTORY */}
      <div className="flex items-center gap-0 mb-6 border-b border-white/8">
        <button
          onClick={() => setSubTab("holdings")}
          className={`px-5 py-2.5 text-[11px] tracking-[0.15em] border-b-2 -mb-[1px] transition-all duration-300 ${
            subTab === "holdings"
              ? "text-white border-white"
              : "text-white/40 border-transparent hover:text-white/60"
          }`}
        >
          HOLDINGS
          {holdings.length > 0 && <span className="ml-2 text-[9px]">({holdings.length})</span>}
        </button>
        <button
          onClick={() => setSubTab("orders")}
          className={`px-5 py-2.5 text-[11px] tracking-[0.15em] border-b-2 -mb-[1px] transition-all duration-300 ${
            subTab === "orders"
              ? "text-white border-white"
              : "text-white/40 border-transparent hover:text-white/60"
          }`}
        >
          ORDER HISTORY
          {orders.length > 0 && <span className="ml-2 text-[9px]">({orders.length})</span>}
        </button>
      </div>

      {subTab === "holdings" ? (
        <HoldingsView
          sorted={sorted}
          investments={investments}
          showValues={showValues}
          sortKey={sortKey}
          toggleSort={toggleSort}
          sortIcon={sortIcon}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
          setSortKey={setSortKey}
          setSortDir={setSortDir}
          mobileDisplay={mobileDisplay}
          setMobileDisplay={setMobileDisplay}
          selectedTicker={selectedTicker}
          setSelectedTicker={setSelectedTicker}
          setQty={setQty}
          setOrderMsg={setOrderMsg}
          selectedStock={selectedStock}
          selectedHolding={selectedHolding}
          selectedLivePrice={selectedLivePrice}
          buySellTab={buySellTab}
          setBuySellTab={setBuySellTab}
          orderType={orderType}
          setOrderType={setOrderType}
          qty={qty}
          pricingType={pricingType}
          setPricingType={setPricingType}
          limitPrice={limitPrice}
          setLimitPrice={setLimitPrice}
          orderMsg={orderMsg}
          displayBalance={displayBalance}
          handleOrder={handleOrder}
          effectivePrice={effectivePrice}
          intradayPositions={intradayPositions}
          loadingIntraday={loadingIntraday}
          recentTxns={recentTxns}
        />
      ) : (
        <OrdersView orders={orders} />
      )}

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

// ─── Holdings view ────────────────────────────────────────────────────────────

type Holding = {
  ticker: string; name: string; qty: number; avgPrice: number;
  currentPrice: number; currentValue: number; investedValue: number;
  returnsPercent: number; returns: number;
  dayChangePercent: number; dayChange: number; sparkline: number[];
};

type HoldingsViewProps = {
  sorted: Holding[];
  investments: { currentValue: number; investedValue: number; totalReturns: number; totalReturnsPercent: number; dayReturns: number };
  showValues: boolean;
  sortKey: SortKey;
  toggleSort: (k: SortKey) => void;
  sortIcon: (k: SortKey) => React.ReactNode;
  sortOpen: boolean; setSortOpen: (b: boolean) => void;
  setSortKey: (k: SortKey) => void; setSortDir: (d: SortDir) => void;
  mobileDisplay: "market" | "current" | "returns" | "dayChange";
  setMobileDisplay: React.Dispatch<React.SetStateAction<"market" | "current" | "returns" | "dayChange">>;
  selectedTicker: string | null; setSelectedTicker: (s: string | null) => void;
  setQty: (n: number) => void; setOrderMsg: (m: { ok: boolean; text: string } | null) => void;
  selectedStock: StockInfo | null;
  selectedHolding: Holding | null | undefined;
  selectedLivePrice: number;
  buySellTab: "BUY" | "SELL"; setBuySellTab: (t: "BUY" | "SELL") => void;
  orderType: "DELIVERY" | "INTRADAY"; setOrderType: (t: "DELIVERY" | "INTRADAY") => void;
  qty: number;
  pricingType: "MARKET" | "LIMIT"; setPricingType: (p: "MARKET" | "LIMIT") => void;
  limitPrice: string; setLimitPrice: (s: string) => void;
  orderMsg: { ok: boolean; text: string } | null;
  displayBalance: number;
  handleOrder: () => void;
  effectivePrice: number;
  intradayPositions: IntradayPosition[]; loadingIntraday: boolean;
  recentTxns: ReturnType<typeof useTrading>["transactions"];
};

function HoldingsView(p: HoldingsViewProps) {
  const {
    sorted, investments, showValues, sortKey, toggleSort, sortIcon,
    sortOpen, setSortOpen, setSortKey, setSortDir, mobileDisplay, setMobileDisplay,
    selectedTicker, setSelectedTicker, setQty, setOrderMsg,
    selectedStock, selectedHolding, selectedLivePrice,
    buySellTab, setBuySellTab, orderType, setOrderType, qty,
    pricingType, setPricingType, limitPrice, setLimitPrice,
    orderMsg, displayBalance, handleOrder, effectivePrice,
    intradayPositions, loadingIntraday, recentTxns,
  } = p;

  return (
    <>
      {/* Mobile: Portfolio summary — Groww-style */}
      <div className="lg:hidden border border-white/10 p-5 mb-6">
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
        <div>
          {/* Desktop: Portfolio summary strip */}
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
              <span className="text-[9px] tracking-[0.1em] text-white/25 ml-auto">VALUE</span>
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
                <div key={h.ticker}>
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
                        {showValues ? <>{h.qty} shares {"\u00B7"} Avg {"\u20B9"}{h.avgPrice.toFixed(2)}</> : <>{h.qty > 0 ? "\u2022\u2022\u2022" : ""}</>}
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
              {sorted.length === 0 && (
                <p className="text-[11px] text-white/30 text-center py-8">You don&apos;t own any stocks yet.</p>
              )}
            </div>
          </div>

          {/* Desktop: Table */}
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
                  <p className="text-[10px] text-white/40 mt-0.5">{h.name}{showValues ? <> {"\u00B7"} {h.qty} shares {"\u00B7"} Avg {"\u20B9"}{h.avgPrice.toFixed(2)}</> : null}</p>
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

            {sorted.length === 0 && (
              <p className="text-[11px] text-white/30 text-center py-12">You don&apos;t own any stocks yet.</p>
            )}
          </div>
        </div>

        {/* Right sidebar (desktop) */}
        <aside className="hidden lg:block space-y-6">
          {selectedStock && (
            <div className="border border-white/10 p-5">
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

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-[var(--font-anton)] text-[15px] tracking-[0.05em]">{selectedStock.ticker}</p>
                  <p className="text-[10px] text-white/40">{selectedStock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-[var(--font-anton)] text-[15px]">{"\u20B9"}{selectedLivePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  <p className={`text-[10px] font-medium ${selectedStock.changePercent >= 0 ? "text-up" : "text-down"}`}>
                    {selectedStock.changePercent >= 0 ? "+" : ""}{selectedStock.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>

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

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] tracking-[0.15em] text-white/30">PRICE</p>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pricingType === "MARKET"}
                      onChange={(e) => {
                        if (e.target.checked) { setPricingType("MARKET"); setLimitPrice(""); }
                        else { setPricingType("LIMIT"); setLimitPrice(selectedLivePrice.toFixed(2)); }
                      }}
                      className="w-3 h-3 accent-white"
                    />
                    <span className="text-[9px] tracking-[0.15em] text-white/50">MARKET</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={pricingType === "MARKET" ? selectedLivePrice.toFixed(2) : limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  disabled={pricingType === "MARKET"}
                  placeholder={selectedLivePrice.toFixed(2)}
                  className={`w-full h-10 bg-transparent border px-4 text-center font-[var(--font-anton)] text-[14px] text-white outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    pricingType === "MARKET" ? "text-white/40 border-white/10 cursor-not-allowed" : "border-white/20 focus:border-white"
                  }`}
                />
              </div>

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

              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] tracking-[0.15em] text-white/30">EST. TOTAL</p>
                <p className="font-[var(--font-anton)] text-[15px]">{"\u20B9"}{(effectivePrice * qty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/8">
                <p className="text-[9px] tracking-[0.15em] text-white/30">BALANCE</p>
                <p className="text-[11px] text-white/50">{"\u20B9"}{displayBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>

              <button
                onClick={handleOrder}
                className={`w-full py-3 text-[11px] tracking-[0.2em] font-medium transition-all hover:opacity-90 ${
                  buySellTab === "BUY" ? "bg-up text-black" : "bg-down text-white"
                }`}
              >
                {pricingType === "LIMIT" ? `${buySellTab} LIMIT` : buySellTab} {selectedStock.ticker}
              </button>

              <Link
                href={`/stock/${selectedStock.ticker}`}
                className="block mt-3 text-[10px] tracking-[0.1em] text-white/30 hover:text-white transition-colors text-center"
              >
                VIEW STOCK DETAILS
              </Link>
            </div>
          )}

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
                          {isProfit ? <TrendingUp size={11} className="text-up" /> : <TrendingDown size={11} className="text-down" />}
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
    </>
  );
}

// ─── Orders view ──────────────────────────────────────────────────────────────

function OrdersView({ orders }: { orders: ReturnType<typeof useTrading>["orders"] }) {
  if (orders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-16 md:py-24"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-18 h-18 md:w-20 md:h-20 border border-white/15 flex items-center justify-center mb-6 relative"
        >
          <div className="w-8 md:w-10 h-[1px] bg-white" />
          <div className="absolute w-[1px] h-8 md:h-10 bg-white" />
          <div className="absolute w-3 md:w-4 h-3 md:h-4 border border-white bottom-1.5 md:bottom-2 left-1.5 md:left-2" />
        </motion.div>
        <h1 className="font-[var(--font-anton)] text-2xl md:text-3xl tracking-[0.1em] uppercase mb-3">
          NO ORDERS YET
        </h1>
        <p className="text-[11px] tracking-[0.1em] text-white/40 text-center max-w-xs mb-6">
          You have no past or pending orders. Place a buy or sell order to see it here.
        </p>
        <Link
          href="/"
          className="px-6 py-3 text-[10px] tracking-[0.15em] bg-white text-black font-semibold hover:bg-transparent hover:text-white border border-white transition-all duration-300"
        >
          EXPLORE STOCKS
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Mobile list */}
      <div className="lg:hidden space-y-2">
        {orders.map((order) => (
          <div key={order.id}>
            <Link
              href={`/stock/${order.ticker}`}
              className="block border border-white/8 p-4 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[9px] tracking-[0.15em] font-semibold px-2 py-0.5 border ${
                    order.type === "BUY" ? "text-up border-up/30 bg-up/5" : "text-down border-down/30 bg-down/5"
                  }`}>
                    {order.type}
                  </span>
                  <span className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{order.ticker}</span>
                </div>
                <span className="text-[9px] tracking-[0.1em] text-up">{order.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-white/50">{order.qty} shares @ {"\u20B9"}{order.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  <p className="text-[9px] text-white/25 mt-0.5">{order.orderType} {"\u00B7"} {new Date(order.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <p className="font-[var(--font-anton)] text-[15px]">{"\u20B9"}{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-[60px_1fr_100px_80px_120px_90px] gap-4 px-4 py-2 border-b border-white/12">
          <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase">TYPE</span>
          <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase">STOCK</span>
          <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right">QTY</span>
          <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right">PRICE</span>
          <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right">TOTAL</span>
          <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right">STATUS</span>
        </div>
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/stock/${order.ticker}`}
            className="grid grid-cols-[60px_1fr_100px_80px_120px_90px] gap-4 px-4 py-3 border-b border-white/6 hover:bg-white/[0.04] transition-colors duration-300 items-center"
          >
            <span className={`text-[9px] tracking-[0.15em] font-semibold px-2 py-0.5 border w-fit ${
              order.type === "BUY" ? "text-up border-up/30 bg-up/5" : "text-down border-down/30 bg-down/5"
            }`}>
              {order.type}
            </span>
            <div>
              <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{order.ticker}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{order.name} {"\u00B7"} {order.orderType}</p>
            </div>
            <p className="text-right font-[var(--font-anton)] text-[13px]">{order.qty}</p>
            <p className="text-right font-[var(--font-anton)] text-[13px]">
              {"\u20B9"}{order.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-right font-[var(--font-anton)] text-[13px]">
              {"\u20B9"}{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <div className="text-right">
              <span className="text-[9px] tracking-[0.1em] text-up">{order.status}</span>
              <p className="text-[9px] text-white/20 mt-0.5">{new Date(order.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
