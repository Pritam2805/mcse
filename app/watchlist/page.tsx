"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronDown, ChevronUp, X, Eye, ArrowUpDown, Bell, BellOff, TrendingUp, TrendingDown } from "lucide-react";
import LoginPrompt from "@/components/LoginPrompt";
import { useAuth } from "@/lib/AuthContext";
import {
  getWatchlist,
  removeFromWatchlist,
  updatePriceAlerts,
  type WatchlistItem,
} from "@/lib/api";

type SortKey = "ticker" | "price";
type SortDir = "asc" | "desc";

export default function WatchlistPage() {
  const { isLoggedIn } = useAuth();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    getWatchlist().then(res => {
      if (res.data) setItems(res.data);
      setLoading(false);
    });
  }, [isLoggedIn]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(s =>
      s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [items, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "ticker") {
        return sortDir === "asc" ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      }
      const ap = a.current_price ?? -Infinity;
      const bp = b.current_price ?? -Infinity;
      return sortDir === "asc" ? ap - bp : bp - ap;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const renderSortIcon = (col: SortKey) =>
    sortKey === col
      ? sortDir === "asc" ? <ChevronUp size={10} className="inline ml-0.5" /> : <ChevronDown size={10} className="inline ml-0.5" />
      : <ChevronDown size={10} className="inline ml-0.5 opacity-30" />;

  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
  const hoveredStock = items.find(s => s.ticker === hoveredTicker);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Price alerts state
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [alertAbove, setAlertAbove] = useState<string>("");
  const [alertBelow, setAlertBelow] = useState<string>("");
  const [alertSaving, setAlertSaving] = useState(false);

  const handleSaveAlerts = async (ticker: string) => {
    setAlertSaving(true);
    const above = alertAbove ? parseFloat(alertAbove) : null;
    const below = alertBelow ? parseFloat(alertBelow) : null;
    await updatePriceAlerts(ticker, above, below);
    setItems(prev => prev.map(s =>
      s.ticker === ticker
        ? { ...s, price_alert_above: above, price_alert_below: below, alert_above_armed: above !== null, alert_below_armed: below !== null }
        : s
    ));
    setAlertSaving(false);
    setAlertsExpanded(false);
  };

  const handleClearAlerts = async (ticker: string) => {
    setAlertSaving(true);
    await updatePriceAlerts(ticker, null, null);
    setItems(prev => prev.map(s =>
      s.ticker === ticker
        ? { ...s, price_alert_above: null, price_alert_below: null, alert_above_armed: false, alert_below_armed: false }
        : s
    ));
    setAlertAbove("");
    setAlertBelow("");
    setAlertSaving(false);
  };

  const handleRemove = async (ticker: string) => {
    await removeFromWatchlist(ticker);
    setItems(prev => prev.filter(s => s.ticker !== ticker));
    if (hoveredTicker === ticker) setHoveredTicker(null);
  };

  const handleMouseEnter = useCallback((stock: WatchlistItem) => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    setHoveredTicker(stock.ticker);
    setAlertAbove(stock.price_alert_above?.toString() ?? "");
    setAlertBelow(stock.price_alert_below?.toString() ?? "");
    setAlertsExpanded(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setHoveredTicker(null), 300);
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="py-6">
        <LoginPrompt message="Log in to view and manage your stock watchlist." />
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-[var(--font-anton)] text-lg md:text-xl tracking-[0.1em] uppercase">WATCHLIST</h1>
        <span className="text-[10px] text-white/30 tracking-[0.1em]">{sorted.length} STOCKS</span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="SEARCH STOCKS..."
        className="w-full h-11 bg-transparent border border-white/15 px-4 text-[16px] tracking-[0.1em] text-white placeholder:text-white/20 outline-none focus:border-white transition-colors duration-150 mb-6"
      />

      {loading ? (
        <p className="text-[11px] text-white/25 animate-pulse tracking-[0.1em] py-8">LOADING WATCHLIST...</p>
      ) : (
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
          <div>
            {/* Mobile: sort + card list */}
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
                    {(["ticker", "price"] as SortKey[]).map(key => (
                      <button
                        key={key}
                        onClick={() => { setSortKey(key); setSortDir("desc"); setSortOpen(false); }}
                        className={`block w-full text-left px-4 py-2.5 text-[10px] tracking-[0.1em] transition-colors ${
                          sortKey === key ? "text-white bg-white/[0.06]" : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                        }`}
                      >
                        {{ ticker: "NAME", price: "PRICE" }[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {sorted.map(stock => (
                  <div key={stock.ticker} className="flex items-center gap-2 bg-white/[0.02] border border-white/6 p-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/stock/${stock.ticker}`} className="block">
                        <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{stock.ticker}</p>
                        <p className="text-[11px] text-white/40 truncate mt-0.5">{stock.name}</p>
                      </Link>
                    </div>
                    <div className="text-right shrink-0 min-w-[80px]">
                      <p className="font-[var(--font-anton)] text-[13px]">
                        {stock.current_price !== null
                          ? `₹${stock.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </p>
                      {(stock.price_alert_above !== null || stock.price_alert_below !== null) && (
                        <p className="text-[9px] text-amber-400 mt-0.5">ALERT SET</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(stock.ticker)}
                      className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-[1fr_130px_130px_40px] gap-4 px-4 py-2 border-b border-white/12">
                <button onClick={() => toggleSort("ticker")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-left hover:text-white transition-colors">
                  COMPANY {renderSortIcon("ticker")}
                </button>
                <button onClick={() => toggleSort("price")} className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right hover:text-white transition-colors">
                  MKT PRICE {renderSortIcon("price")}
                </button>
                <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase text-right">ALERTS</span>
                <span />
              </div>

              {sorted.map(stock => (
                <div
                  key={stock.ticker}
                  className="grid grid-cols-[1fr_130px_130px_40px] gap-4 px-4 py-3 border-b border-white/6 hover:bg-white/[0.04] transition-colors duration-150 items-center"
                  onMouseEnter={() => handleMouseEnter(stock)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link href={`/stock/${stock.ticker}`} className="block min-w-0">
                    <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{stock.ticker}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 truncate">{stock.name}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">{stock.sector}</p>
                  </Link>
                  <div className="text-right">
                    <p className="font-[var(--font-anton)] text-[13px]">
                      {stock.current_price !== null
                        ? `₹${stock.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    {(stock.price_alert_above !== null || stock.price_alert_below !== null) ? (
                      <span className="text-[9px] text-amber-400 tracking-[0.08em]">ACTIVE</span>
                    ) : (
                      <span className="text-[9px] text-white/15">—</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(stock.ticker)}
                    className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {sorted.length === 0 && search.length > 0 && (
              <div className="py-16 text-center">
                <p className="text-[11px] tracking-[0.15em] text-white/20 uppercase">NO RESULTS FOR &quot;{search}&quot;</p>
              </div>
            )}

            {items.length === 0 && search.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-20 md:py-28"
              >
                <div className="w-16 h-16 border border-white/15 flex items-center justify-center mb-6">
                  <Eye size={24} strokeWidth={1.5} className="text-white/20" />
                </div>
                <h2 className="font-[var(--font-anton)] text-xl md:text-2xl tracking-[0.1em] uppercase mb-2">
                  NO STOCKS WATCHED
                </h2>
                <p className="text-[11px] tracking-[0.1em] text-white/40 text-center max-w-xs mb-6">
                  Your watchlist is empty. Explore the market and add stocks you want to track.
                </p>
                <Link
                  href="/stocks"
                  className="px-8 py-3 text-[10px] tracking-[0.15em] bg-white text-black font-semibold hover:bg-transparent hover:text-white border border-white transition-all duration-150"
                >
                  EXPLORE STOCKS
                </Link>
              </motion.div>
            )}
          </div>

          {/* Right sidebar (desktop): Stock preview + alerts panel */}
          <aside
            className="hidden lg:block"
            onMouseEnter={() => { if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; } }}
            onMouseLeave={handleMouseLeave}
          >
            <AnimatePresence mode="wait">
              {hoveredStock ? (
                <motion.div
                  key={hoveredStock.ticker}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="border border-white/10 p-5 sticky top-24"
                >
                  <p className="font-[var(--font-anton)] text-lg tracking-[0.05em] mb-0.5">{hoveredStock.ticker}</p>
                  <p className="text-[11px] text-white/40 mb-4">{hoveredStock.name}</p>

                  <div className="mb-4">
                    <p className="text-[9px] tracking-[0.15em] text-white/30 mb-1">CURRENT PRICE</p>
                    <p className="font-[var(--font-anton)] text-2xl tracking-tight">
                      {hoveredStock.current_price !== null
                        ? `₹${hoveredStock.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </p>
                  </div>

                  <div className="text-[9px] text-white/20 mb-4">
                    Added {new Date(hoveredStock.added_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </div>

                  <Link
                    href={`/stock/${hoveredStock.ticker}`}
                    className="block mb-4 py-2.5 text-center text-[10px] tracking-[0.15em] border border-white/20 text-white/50 hover:text-white hover:border-white transition-all"
                  >
                    VIEW DETAILS
                  </Link>

                  {/* Price Alerts Section */}
                  <div className="border-t border-white/8 pt-4">
                    <button
                      onClick={() => setAlertsExpanded(!alertsExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        {hoveredStock.price_alert_above !== null || hoveredStock.price_alert_below !== null ? (
                          <Bell size={12} className="text-amber-400" />
                        ) : (
                          <BellOff size={12} className="text-white/30" />
                        )}
                        <span className="text-[10px] tracking-[0.1em] text-white/50">PRICE ALERTS</span>
                        {(hoveredStock.price_alert_above !== null || hoveredStock.price_alert_below !== null) && (
                          <span className="text-[8px] tracking-[0.1em] bg-amber-400/20 text-amber-400 px-1.5 py-0.5">ACTIVE</span>
                        )}
                      </div>
                      {alertsExpanded
                        ? <ChevronUp size={12} className="text-white/30" />
                        : <ChevronDown size={12} className="text-white/30" />}
                    </button>

                    <AnimatePresence>
                      {alertsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 space-y-3">
                            <div>
                              <label className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] text-white/30 mb-1.5">
                                <TrendingUp size={10} className="text-up" />
                                ALERT WHEN ABOVE
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-white/30 text-[11px]">₹</span>
                                <input
                                  type="number"
                                  value={alertAbove}
                                  onChange={e => setAlertAbove(e.target.value)}
                                  placeholder={hoveredStock.current_price ? String(Math.round(hoveredStock.current_price * 1.05)) : ""}
                                  className="flex-1 h-9 bg-transparent border border-white/15 px-3 text-[12px] text-white placeholder:text-white/15 outline-none focus:border-white/40 transition-colors"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] text-white/30 mb-1.5">
                                <TrendingDown size={10} className="text-down" />
                                ALERT WHEN BELOW
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-white/30 text-[11px]">₹</span>
                                <input
                                  type="number"
                                  value={alertBelow}
                                  onChange={e => setAlertBelow(e.target.value)}
                                  placeholder={hoveredStock.current_price ? String(Math.round(hoveredStock.current_price * 0.95)) : ""}
                                  className="flex-1 h-9 bg-transparent border border-white/15 px-3 text-[12px] text-white placeholder:text-white/15 outline-none focus:border-white/40 transition-colors"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleSaveAlerts(hoveredStock.ticker)}
                                disabled={alertSaving || (!alertAbove && !alertBelow)}
                                className="flex-1 h-9 text-[9px] tracking-[0.12em] bg-white text-black font-medium hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                {alertSaving ? "SAVING..." : "SET ALERTS"}
                              </button>
                              {(hoveredStock.price_alert_above !== null || hoveredStock.price_alert_below !== null) && (
                                <button
                                  onClick={() => handleClearAlerts(hoveredStock.ticker)}
                                  disabled={alertSaving}
                                  className="h-9 px-3 text-[9px] tracking-[0.1em] border border-red-400/30 text-red-400 hover:bg-red-400/10 disabled:opacity-30 transition-colors"
                                >
                                  CLEAR
                                </button>
                              )}
                            </div>

                            {(hoveredStock.price_alert_above !== null || hoveredStock.price_alert_below !== null) && (
                              <div className="pt-2 border-t border-white/8 space-y-1.5">
                                <p className="text-[8px] tracking-[0.15em] text-white/20">CURRENT ALERTS</p>
                                {hoveredStock.price_alert_above !== null && (
                                  <p className="text-[10px] text-white/40">
                                    <span className="text-up">▲</span> Above ₹{hoveredStock.price_alert_above.toLocaleString("en-IN")}
                                    {!hoveredStock.alert_above_armed && <span className="text-white/20 ml-1">(triggered)</span>}
                                  </p>
                                )}
                                {hoveredStock.price_alert_below !== null && (
                                  <p className="text-[10px] text-white/40">
                                    <span className="text-down">▼</span> Below ₹{hoveredStock.price_alert_below.toLocaleString("en-IN")}
                                    {!hoveredStock.alert_below_armed && <span className="text-white/20 ml-1">(triggered)</span>}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border border-white/8 p-8 flex items-center justify-center min-h-[200px]"
                >
                  <p className="text-[11px] tracking-[0.15em] text-white/15 text-center uppercase">
                    HOVER A STOCK<br />TO PREVIEW
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
      )}
    </div>
  );
}
