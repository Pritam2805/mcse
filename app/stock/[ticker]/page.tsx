"use client";

import { useState, use, useCallback, useMemo, useEffect } from "react";
import { ArrowLeft, Star, Bookmark, X, Copy, Check, ExternalLink, Users, Calendar, Building2, User, Briefcase } from "lucide-react";
import Portal from "@/components/Portal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { stockDirectory, parentCompanies } from "@/lib/mockData";
import { useTrading } from "@/lib/TradingContext";
import { usePreferences } from "@/lib/PreferencesContext";
import { useMarketTick } from "@/lib/WebSocketContext";
import { getShareholders, getStock, getNews, Shareholder, StockDetail, type NewsItem } from "@/lib/api";
import OrderConfirmModal from "@/components/OrderConfirmModal";
import Sparkline from "@/components/Sparkline";

const timeRanges = ["1H", "3H", "1D", "3D", "ALL"] as const;

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const router = useRouter();
  const stock = stockDirectory[ticker.toUpperCase()];
  const liveTick = useMarketTick(ticker.toUpperCase());
  const [apiStock, setApiStock] = useState<StockDetail | null>(null);
  const displayPrice = liveTick?.price ?? stock?.price ?? apiStock?.price ?? 0;
  const isLive = liveTick != null;
  const { placeOrder, getOrdersForTicker, positions, balance, isWatched: checkWatched, toggleWatchlist } = useTrading();
  const [range, setRange] = useState<string>("1D");
  const [qty, setQty] = useState(1);
  const [buySellTab, setBuySellTab] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"DELIVERY" | "INTRADAY">("DELIVERY");
  const [pricingType, setPricingType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [orderMsg, setOrderMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"ORDER" | "BOOK" | "HISTORY">("ORDER");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sectionTab, setSectionTab] = useState<"OVERVIEW" | "NEWS" | "EVENTS" | "COMPANY" | "SHAREHOLDERS">("OVERVIEW");
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [stockNews, setStockNews] = useState<NewsItem[]>([]);
  const [tickerCopied, setTickerCopied] = useState(false);
  const [chartType, setChartType] = useState<"LINE" | "CANDLE">("LINE");
  const { confirmOrders } = usePreferences();
  // expandedNewsIndex removed — news now navigates to /news/[id] page

  useEffect(() => {
    getStock(ticker).then(res => { if (res.data) setApiStock(res.data); });
    getNews({ ticker: ticker.toUpperCase(), limit: 10 }).then(res => {
      if (res.data) setStockNews(res.data);
    });
  }, [ticker]);

  // Fetch shareholders when tab is selected
  useEffect(() => {
    if (sectionTab === "SHAREHOLDERS" && shareholders.length === 0) {
      getShareholders(ticker.toUpperCase()).then(res => {
        if (res.data) setShareholders(res.data);
      });
    }
  }, [sectionTab, ticker, shareholders.length]);

  const watched = checkWatched(ticker.toUpperCase());
  const tickerOrders = getOrdersForTicker(ticker.toUpperCase());
  const position = positions.find((p) => p.ticker === ticker.toUpperCase());
  const isHeld = position !== undefined;
  const orderBook = useMemo(() => {
    if (liveTick?.book) {
      return {
        bids: liveTick.book.bids.map(([price, qty]) => ({ price, qty, orders: Math.ceil(qty / 100) })),
        asks: liveTick.book.asks.map(([price, qty]) => ({ price, qty, orders: Math.ceil(qty / 100) })),
      };
    }
    return null;
  }, [liveTick]);

  const effectivePrice = pricingType === "LIMIT" && limitPrice ? parseFloat(limitPrice) : displayPrice;

  // Pre-compute candle data with deterministic offsets to avoid purity errors
  const candleData = useMemo(() => {
    if (!stock) return [];
    const cd = stock.chartData[range] || stock.chartData["1D"];
    const vals = cd.map((d: { price: number }) => d.price);
    const n = vals.length;
    if (n < 2) return [];
    const candles: { open: number; close: number; high: number; low: number }[] = [];
    for (let i = 1; i < n; i++) {
      const open = vals[i - 1];
      const close = vals[i];
      // Deterministic spread based on index
      const spread = 0.001 + (((i * 7 + 3) % 11) / 11) * 0.002;
      const high = Math.max(open, close) * (1 + spread);
      const low = Math.min(open, close) * (1 - spread);
      candles.push({ open, close, high, low });
    }
    return candles;
  }, [stock, range]);

  const executeOrder = useCallback(() => {
    if (!stock) return;
    const result = placeOrder({
      ticker: stock.ticker,
      name: stock.name,
      type: buySellTab,
      orderType,
      pricingType,
      qty,
      price: displayPrice,
      ...(pricingType === "LIMIT" && limitPrice ? { limitPrice: parseFloat(limitPrice) } : {}),
    });
    setOrderMsg({ text: result.message, success: result.success });
    if (result.success) { setQty(1); setLimitPrice(""); }
    setTimeout(() => setOrderMsg(null), 3000);
  }, [stock, placeOrder, buySellTab, orderType, pricingType, limitPrice, qty, displayPrice]);

  const handleOrder = useCallback(() => {
    if (confirmOrders) {
      setConfirmOpen(true);
    } else {
      executeOrder();
    }
  }, [confirmOrders, executeOrder]);

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-[var(--font-anton)] text-2xl tracking-[0.1em] uppercase mb-2"
        >
          STOCK NOT FOUND
        </motion.h1>
        <p className="text-[11px] text-white/40 mb-4">{ticker.toUpperCase()}</p>
        <Link
          href="/"
          className="px-6 py-3 text-[10px] tracking-[0.15em] bg-white text-black font-semibold hover:bg-transparent hover:text-white border border-white transition-all duration-150"
        >
          BACK TO EXPLORE
        </Link>
      </div>
    );
  }

  const chartData = stock.chartData[range] || stock.chartData["1D"];
  const chartValues = chartData.map((d: { price: number }) => d.price);

  return (
    <div className="mobile-stock-pad lg:pb-0">
      {/* Portaled overlays: toast + mobile buy/sell bar. Escapes any ancestor
          containing block so they anchor to the viewport. */}
      <Portal>
        <AnimatePresence>
          {orderMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className={`fixed left-1/2 -translate-x-1/2 z-[70] px-6 py-3 border text-[11px] tracking-[0.1em] ${
                orderMsg.success
                  ? "bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]"
                  : "bg-[#FF5252]/10 border-[#FF5252]/30 text-[#FF5252]"
              }`}
              style={{ top: 'calc(env(safe-area-inset-top) + 5rem)' }}
            >
              {orderMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed left-0 right-0 z-[55] lg:hidden border-t border-white/10 bg-bg/95 backdrop-blur-md" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
          <div className="flex">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setBuySellTab("BUY"); setMobileOrderOpen(true); }}
              className="flex-1 py-4 text-[11px] tracking-[0.15em] font-semibold bg-[#00D26A] text-black active:bg-[#00D26A]/80 transition-all"
            >
              BUY
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setBuySellTab("SELL"); setMobileOrderOpen(true); }}
              className="flex-1 py-4 text-[11px] tracking-[0.15em] font-semibold bg-[#FF5252] text-white active:bg-[#FF5252]/80 transition-all"
            >
              SELL
            </motion.button>
          </div>
        </div>
      </Portal>

      {/* Header */}
      <div
        className="flex items-center justify-between flex-wrap gap-3 py-4 border-b border-white/8"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-11 h-11 border border-white/20 flex items-center justify-center hover:border-white active:bg-white/[0.04] transition-colors duration-150"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-3">
            <div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(stock.ticker);
                  setTickerCopied(true);
                  setTimeout(() => setTickerCopied(false), 1500);
                }}
                aria-label={`Copy ticker ${stock.ticker}`}
                className="group inline-flex items-center gap-1.5 hover:text-white transition-colors duration-200"
              >
                <span className="font-[var(--font-anton)] text-base md:text-lg tracking-[0.05em]">{stock.ticker}</span>
                {tickerCopied ? (
                  <Check size={11} className="text-[#00D26A]" />
                ) : (
                  <Copy size={11} className="text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              <p className="text-[10px] text-white/40 truncate max-w-[140px] md:max-w-none">{stock.name}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isHeld && (
            <span className="flex items-center gap-1.5 text-[8px] tracking-[0.15em] text-[#00D26A] border border-[#00D26A]/30 bg-[#00D26A]/10 px-2.5 py-1 cursor-default" title="You hold this stock">
              <Bookmark size={10} fill="currentColor" /> HELD
            </span>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleWatchlist(ticker.toUpperCase())}
            className={`flex items-center gap-1.5 text-[8px] tracking-[0.15em] px-2.5 py-1 border transition-all duration-200 ${
              watched
                ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                : "text-white/40 border-white/15 hover:text-white hover:border-white/30"
            }`}
            title={watched ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star size={10} fill={watched ? "currentColor" : "none"} />
            {watched ? "WATCHED" : "WATCH"}
          </motion.button>
        </div>
      </div>

      {/* Desktop: 2-column grid (70% / 30%) */}
      <div className="lg:grid lg:grid-cols-[7fr_3fr] lg:gap-0 py-6">
        {/* Main content - Col 1: Chart + Price */}
        <div className="min-w-0 lg:pr-6">
          {/* Price */}
          <div
            className="mb-7 md:mb-8"
          >
            <p className="font-[var(--font-anton)] text-3xl md:text-4xl tracking-tight mb-1.5">
              {"\u20B9"}{displayPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-3">
              <p className={`text-[12px] font-medium ${stock.changePercent >= 0 ? "text-[#00D26A]" : "text-[#FF5252]"}`}>
                {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}% {"\u00B7"} {range}
              </p>
              {isLive && (
                <span className="text-[8px] tracking-[0.15em] text-[#00D26A] border border-[#00D26A]/40 bg-[#00D26A]/10 px-2 py-0.5">LIVE</span>
              )}
              {position && (
                <span className="text-[10px] text-white/40 border border-white/10 px-2 py-0.5">
                  {position.qty} shares held
                </span>
              )}
            </div>
          </div>

          {/* Chart — full bleed on mobile like Groww */}
          <div
            className="mb-5 md:mb-6 md:border md:border-white/8 -mx-4 px-4 md:mx-0 md:p-6 py-4"
          >
            <div className="w-full overflow-hidden">
              {chartType === "LINE" ? (
                <Sparkline
                  data={chartValues}
                  width={960}
                  height={280}
                  strokeWidth={1.5}
                  positive={stock.changePercent >= 0}
                  interactive
                  labels={chartData.map((d) => d.day)}
                  baseline={["1H", "3H", "1D"].includes(range) ? chartValues[0] : undefined}
                />
              ) : (
                <svg viewBox="0 0 960 280" width={960} height={280} className="block overflow-visible" style={{ maxWidth: '100%', height: 'auto' }}>
                  {(() => {
                    if (candleData.length === 0) return null;
                    const allMin = Math.min(...chartValues);
                    const allMax = Math.max(...chartValues);
                    const priceRange = allMax - allMin || 1;
                    const pad = 2;
                    const barW = (960 - pad * 2) / candleData.length;
                    const toY = (v: number) => 280 - pad - ((v - allMin) / priceRange) * (280 - pad * 2);
                    return candleData.map((c, i) => {
                      const x = pad + i * barW + barW / 2;
                      const bullish = c.close >= c.open;
                      const color = bullish ? "var(--color-up)" : "var(--color-down)";
                      const bodyTop = toY(Math.max(c.open, c.close));
                      const bodyBot = toY(Math.min(c.open, c.close));
                      const bodyH = Math.max(bodyBot - bodyTop, 1);
                      const w = barW * 0.6;
                      return (
                        <g key={i}>
                          <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={color} strokeWidth={1} />
                          <rect x={x - w / 2} y={bodyTop} width={w} height={bodyH} fill={bullish ? color : color} stroke={color} strokeWidth={0.5} fillOpacity={bullish ? 0.3 : 0.8} />
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}
            </div>
            <div className="flex justify-between mt-3">
              {(() => {
                const maxLabels = 7;
                if (chartData.length <= maxLabels) {
                  return chartData.map((d) => (
                    <span key={d.day} className="text-[9px] text-white/20">{d.day}</span>
                  ));
                }
                const step = (chartData.length - 1) / (maxLabels - 1);
                return Array.from({ length: maxLabels }, (_, i) => {
                  const idx = Math.round(i * step);
                  const d = chartData[idx];
                  return <span key={d.day} className="text-[9px] text-white/20">{d.day}</span>;
                });
              })()}
            </div>
          </div>

          {/* Time range selector — scrollable like Groww */}
          <div
            className="flex items-center gap-0 mb-6 md:mb-8 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
          >
            {timeRanges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 h-11 md:h-9 text-[10px] tracking-[0.15em] border-b-2 transition-all duration-150 ${
                  range === r
                    ? "text-white border-white"
                    : "text-white/40 border-transparent hover:text-white/60"
                }`}
              >
                {r}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-0 shrink-0">
              {(["LINE", "CANDLE"] as const).map((ct) => (
                <button
                  key={ct}
                  onClick={() => setChartType(ct)}
                  className={`px-3 h-11 md:h-9 text-[9px] tracking-[0.12em] border-b-2 transition-all duration-150 ${
                    chartType === ct
                      ? "text-white border-white"
                      : "text-white/25 border-transparent hover:text-white/50"
                  }`}
                >
                  {ct === "LINE" ? "LINE" : "OHLC"}
                </button>
              ))}
            </div>
          </div>

          {/* Section tabs — Groww style */}
          <div className="flex items-center gap-0 mb-6 md:mb-8 border-b border-white/8 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
            {(["OVERVIEW", "NEWS", "EVENTS", "COMPANY", "SHAREHOLDERS"] as const)
              .filter((tab) => {
                if (tab === "NEWS") return stockNews.length > 0;
                if (tab === "EVENTS") return stock.events && stock.events.length > 0;
                return true;
              })
              .map((tab) => (
              <button
                key={tab}
                onClick={() => setSectionTab(tab)}
                className={`px-5 py-3 text-[10px] tracking-[0.15em] font-medium border-b-2 transition-all duration-150 whitespace-nowrap ${
                  sectionTab === tab
                    ? "text-white border-white"
                    : "text-white/35 border-transparent hover:text-white/60"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Your holding info (if held) — uses position data for consistency */}
          {position && sectionTab === "OVERVIEW" && (
            <div
              className="mb-7 md:mb-8 border border-white/10 p-5"
            >
              <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">YOUR HOLDING</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-white/25 uppercase mb-1.5">QTY</p>
                  <p className="font-[var(--font-anton)] text-base">{position.qty}</p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-white/25 uppercase mb-1.5">AVG PRICE</p>
                  <p className="font-[var(--font-anton)] text-base">{"\u20B9"}{position.avgPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-white/25 uppercase mb-1.5">INVESTED</p>
                  <p className="font-[var(--font-anton)] text-base">{"\u20B9"}{(position.avgPrice * position.qty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.15em] text-white/25 uppercase mb-1.5">RETURNS</p>
                  <p className={`font-[var(--font-anton)] text-base ${position.pnlPercent >= 0 ? "text-[#00D26A]" : "text-[#FF5252]"}`}>
                    {position.pnlPercent >= 0 ? "+" : ""}{position.pnlPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overview */}
          {sectionTab === "OVERVIEW" && (
          <>
          <div>
            <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">OVERVIEW</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-white/8">
              {[
                { label: "OPEN", value: stock.overview.open },
                { label: "DAY LOW", value: stock.overview.dayLow },
                { label: "DAY HIGH", value: stock.overview.dayHigh },
              ].map((item) => (
                <div key={item.label} className="bg-bg p-4 md:p-5">
                  <p className="text-[9px] tracking-[0.2em] text-white/25 uppercase mb-1.5">{item.label}</p>
                  <p className="font-[var(--font-anton)] text-lg md:text-xl">
                    {"\u20B9"}{item.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* About the Company */}
          {stock.about && (
            <div
              className="mt-7 md:mt-8"
            >
              <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">ABOUT {stock.ticker}</h3>
              <div className="border border-white/8 p-5">
                <p className="text-[12px] md:text-[13px] text-white/50 leading-relaxed">{stock.about}</p>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/6">
                  <span className="text-[9px] tracking-[0.15em] text-white/25">SECTOR</span>
                  <span className="text-[10px] text-white/50">{stock.fundamentals.sector}</span>
                </div>
              </div>
            </div>
          )}

          {/* 52-Week Range */}
          <div
            className="mt-7 md:mt-8"
          >
            <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">3-DAY RANGE <span className="text-[9px] text-white/25 font-normal tracking-[0.1em]">APR 24{"\u2013"}26</span></h3>
            <div className="border border-white/8 p-5">
              {(() => {
                const low3d = +(displayPrice * 0.965).toFixed(2);
                const high3d = +(displayPrice * 1.035).toFixed(2);
                return (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] text-white/30">{"\u20B9"}{low3d.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-white/30">{"\u20B9"}{high3d.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="h-1.5 bg-white/8 relative">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-white/40"
                        style={{
                          left: `${Math.min(100, Math.max(0, ((displayPrice - low3d) / (high3d - low3d)) * 100))}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div
                        className="h-full bg-gradient-to-r from-[#FF5252]/40 via-white/20 to-[#00D26A]/40"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <p className="text-[9px] text-white/20 mt-2 text-center">
                      CURRENT: {"\u20B9"}{displayPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Fundamentals */}
          <div
            className="mt-7 md:mt-8"
          >
            <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">FUNDAMENTALS</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-white/8">
              {[
                { label: "MARKET CAP", value: stock.fundamentals.marketCap },
                { label: "BOOK VALUE", value: `\u20B9${stock.fundamentals.bookValue.toLocaleString("en-IN")}` },
                { label: "VOLUME", value: stock.fundamentals.volume },
              ].map((item) => (
                <div key={item.label} className="bg-bg p-4">
                  <p className="text-[9px] tracking-[0.2em] text-white/25 uppercase mb-1.5">{item.label}</p>
                  <p className="font-[var(--font-anton)] text-base">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 px-1">
              <p className="text-[9px] tracking-[0.1em] text-white/20">SECTOR: <span className="text-white/40">{stock.fundamentals.sector}</span></p>
            </div>
          </div>
          </>
          )}

          {/* News tab content */}
          {sectionTab === "NEWS" && (
            <div className="space-y-3">
              {stockNews.length > 0 ? stockNews.map(news => (
                <Link key={news.id} href={`/news/${news.id}`} className="block border border-white/8 p-4 hover:bg-white/[0.02] transition-colors">
                  <p className="text-[12px] text-white/60 leading-relaxed mb-2">{news.headline}</p>
                  <div className="flex items-center gap-3">
                    {news.published_at && (
                      <span className="text-[9px] tracking-[0.1em] text-white/25">
                        {new Date(news.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium ${news.sentiment > 0.1 ? "text-[#00D26A]" : news.sentiment < -0.1 ? "text-[#FF5252]" : "text-white/30"}`}>
                      {news.sentiment > 0.1 ? "BULLISH" : news.sentiment < -0.1 ? "BEARISH" : "NEUTRAL"}
                    </span>
                  </div>
                </Link>
              )) : (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 mx-auto border border-white/8 flex items-center justify-center mb-3">
                    <Copy size={16} className="text-white/15" />
                  </div>
                  <p className="text-[11px] tracking-[0.1em] text-white/25">NO NEWS FOR {stock?.ticker ?? ticker.toUpperCase()}</p>
                  <p className="text-[9px] text-white/12 mt-1.5">News will appear here during trading</p>
                </div>
              )}
            </div>
          )}

          {/* Events tab content */}
          {sectionTab === "EVENTS" && (
            <div className="space-y-3">
              {stock.events && stock.events.length > 0 ? stock.events.map((event, i) => {
                const typeColors: Record<string, string> = {
                  RESULTS: "text-[#00D26A] border-[#00D26A]/30 bg-[#00D26A]/5",
                  AGM: "text-blue-400 border-blue-400/30 bg-blue-400/5",
                  DIVIDEND: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
                  EVENT: "text-white/50 border-white/20 bg-white/5",
                };
                return (
                  <div key={i} className="border border-white/8 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[8px] tracking-[0.15em] font-semibold px-2 py-0.5 border ${typeColors[event.type] || typeColors.EVENT}`}>
                        {event.type}
                      </span>
                      <p className="text-[12px] text-white/60">{event.title}</p>
                    </div>
                    <span className="text-[9px] tracking-[0.1em] text-white/25 whitespace-nowrap ml-3">
                      {new Date(event.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                );
              }) : (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 mx-auto border border-white/8 flex items-center justify-center mb-3">
                    <Calendar size={16} className="text-white/15" />
                  </div>
                  <p className="text-[11px] tracking-[0.1em] text-white/25">NO UPCOMING EVENTS</p>
                  <p className="text-[9px] text-white/12 mt-1.5">Events will appear during APR 24–26</p>
                </div>
              )}
            </div>
          )}

          {sectionTab === "COMPANY" && (() => {
            const parent = parentCompanies.find(p => p.subsidiaries.includes(ticker.toUpperCase()));
            if (!parent) return <p className="text-[11px] text-white/25 py-12 text-center tracking-[0.1em]">NO PARENT COMPANY DATA</p>;
            const siblingTickers = parent.subsidiaries.filter(t => t !== ticker.toUpperCase());
            const siblings = siblingTickers.map(t => stockDirectory[t]).filter(Boolean);
            return (
              <div className="space-y-6">
                <div className="border border-white/6 p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-11 h-11 border border-white/25 flex items-center justify-center">
                      <span className="font-[var(--font-anton)] text-base text-white/70">{parent.logoLetter}</span>
                    </div>
                    <div>
                      <Link href={`/company/${parent.ticker}`} className="group inline-flex items-center gap-1.5">
                        <span className="font-[var(--font-anton)] text-[15px] tracking-[0.05em] group-hover:text-white transition-colors">{parent.name}</span>
                        <ExternalLink size={10} className="text-white/20 group-hover:text-white/60 transition-colors" />
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] tracking-[0.15em] text-white/30">{parent.ticker}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] leading-[1.8] text-white/50">{parent.about}</p>
                </div>

                <div className="flex items-center gap-6 text-[11px] text-white/40">
                  <div className="flex items-center gap-1.5">
                    <Users size={11} className="text-white/20" />
                    <span>{parent.totalEmployees} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-white/20" />
                    <span>Est. {parent.founded}</span>
                  </div>
                </div>

                {siblings.length > 0 && (
                  <div>
                    <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-3">SIBLING SUBSIDIARIES</p>
                    <div className="space-y-2">
                      {siblings.map((sub) => (
                        <Link
                          key={sub.ticker}
                          href={`/stock/${sub.ticker}`}
                          className="flex items-center gap-4 border border-white/6 p-4 hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-[var(--font-anton)] text-[13px] tracking-[0.05em]">{sub.ticker}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">{sub.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-[var(--font-anton)] text-[13px]">{'\u20B9'}{sub.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                            <p className={`text-[10px] font-medium ${sub.changePercent >= 0 ? "text-up" : "text-down"}`}>
                              {sub.changePercent >= 0 ? "+" : ""}{sub.changePercent.toFixed(2)}%
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Shareholders */}
          {sectionTab === "SHAREHOLDERS" && (
            <div>
              <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-4">SHAREHOLDERS</h3>
              {shareholders.length === 0 ? (
                <div className="border border-white/6 border-dashed p-8 text-center">
                  <Users size={20} className="mx-auto text-white/10 mb-3" />
                  <p className="text-[11px] tracking-[0.1em] text-white/20">Loading shareholders...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-[1px] bg-white/8 mb-4">
                    <div className="bg-bg p-4">
                      <p className="text-[9px] tracking-[0.15em] text-white/25 mb-1">TOTAL</p>
                      <p className="font-[var(--font-anton)] text-lg">{shareholders.length}</p>
                    </div>
                    <div className="bg-bg p-4">
                      <p className="text-[9px] tracking-[0.15em] text-white/25 mb-1">INSTITUTIONAL</p>
                      <p className="font-[var(--font-anton)] text-lg">
                        {shareholders.filter(s => s.archetypeKind === "INSTITUTIONAL").reduce((sum, s) => sum + s.percentage, 0).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-bg p-4">
                      <p className="text-[9px] tracking-[0.15em] text-white/25 mb-1">RETAIL</p>
                      <p className="font-[var(--font-anton)] text-lg">
                        {shareholders.filter(s => s.archetypeKind === "RETAIL_AGGREGATE" || s.archetypeKind === "HUMAN").reduce((sum, s) => sum + s.percentage, 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Shareholders list */}
                  <div className="border border-white/10">
                    <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_80px] gap-4 px-5 py-3 border-b border-white/8">
                      <span className="text-[9px] tracking-[0.15em] text-white/25">HOLDER</span>
                      <span className="text-[9px] tracking-[0.15em] text-white/25">TYPE</span>
                      <span className="text-[9px] tracking-[0.15em] text-white/25 text-right">SHARES</span>
                      <span className="text-[9px] tracking-[0.15em] text-white/25 text-right">%</span>
                    </div>
                    {shareholders.map((holder, i) => {
                      const TypeIcon = holder.archetypeKind === "INSTITUTIONAL" ? Building2 :
                                       holder.archetypeKind === "INSIDER" ? Briefcase :
                                       holder.archetypeKind === "HUMAN" ? User : Users;
                      const typeLabel = holder.archetypeKind === "RETAIL_AGGREGATE" ? "RETAIL" :
                                        holder.archetypeKind === "POOL_PROXY" ? "POOL" :
                                        holder.archetypeKind;
                      return (
                        <div key={i} className={`px-5 py-3.5 ${i < shareholders.length - 1 ? "border-b border-white/6" : ""}`}>
                          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_80px] gap-4 items-center">
                            <div className="flex items-center gap-2.5">
                              <TypeIcon size={14} className="text-white/30 shrink-0" />
                              <span className="text-[11px] text-white/60">{holder.name}</span>
                            </div>
                            <span className={`text-[8px] tracking-[0.1em] px-1.5 py-0.5 border w-fit ${
                              holder.archetypeKind === "INSTITUTIONAL" ? "text-blue-400 border-blue-400/20" :
                              holder.archetypeKind === "INSIDER" ? "text-amber-400 border-amber-400/20" :
                              "text-white/30 border-white/15"
                            }`}>{typeLabel}</span>
                            <span className="text-[10px] text-white/40 text-right">{holder.shareCount.toLocaleString("en-IN")}</span>
                            <span className="text-[11px] font-[var(--font-anton)] text-right">{holder.percentage.toFixed(2)}%</span>
                          </div>
                          {/* Mobile view */}
                          <div className="md:hidden flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <TypeIcon size={14} className="text-white/30" />
                              <div>
                                <p className="text-[10px] text-white/60">{holder.name}</p>
                                <span className={`text-[7px] tracking-[0.1em] px-1 py-0.5 border ${
                                  holder.archetypeKind === "INSTITUTIONAL" ? "text-blue-400 border-blue-400/20" :
                                  holder.archetypeKind === "INSIDER" ? "text-amber-400 border-amber-400/20" :
                                  "text-white/25 border-white/15"
                                }`}>{typeLabel}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-[var(--font-anton)] text-[12px]">{holder.percentage.toFixed(2)}%</p>
                              <p className="text-[9px] text-white/30">{holder.shareCount.toLocaleString("en-IN")}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right column (desktop): Sticky order panel + order book + news + orders */}
        <aside className="hidden lg:block border-l border-white/8 pl-6">
          <div className="space-y-6">
            <div>
            <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-3">PLACE ORDER</p>

            {/* BUY / SELL tabs */}
            <div className="flex gap-0 mb-4">
              <button
                onClick={() => setBuySellTab("BUY")}
                className={`flex-1 py-2 text-[10px] tracking-[0.15em] font-medium border-b-2 transition-all duration-300 ${buySellTab === "BUY" ? "text-[#00D26A] border-[#00D26A] bg-[#00D26A]/10" : "text-white/40 border-transparent hover:text-white/60"}`}
              >
                BUY
              </button>
              <button
                onClick={() => setBuySellTab("SELL")}
                className={`flex-1 py-2 text-[10px] tracking-[0.15em] font-medium border-b-2 transition-all duration-300 ${buySellTab === "SELL" ? "text-[#FF5252] border-[#FF5252] bg-[#FF5252]/10" : "text-white/40 border-transparent hover:text-white/60"}`}
              >
                SELL
              </button>
            </div>

            {/* Order type */}
            <div>
              <div className="flex gap-0 mb-1.5">
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
              <p className="text-[8px] tracking-[0.05em] text-white/20">
                {orderType === "DELIVERY" ? "Shares held in your portfolio long-term" : "Buy & sell within the same trading day"}
              </p>
            </div>

            {/* Price */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] tracking-[0.1em] text-white/40">PRICE</label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pricingType === "MARKET"}
                    onChange={(e) => {
                      if (e.target.checked) { setPricingType("MARKET"); setLimitPrice(""); }
                      else { setPricingType("LIMIT"); setLimitPrice(displayPrice.toFixed(2)); }
                    }}
                    className="w-3 h-3 accent-white"
                  />
                  <span className="text-[9px] tracking-[0.15em] text-white/50">MARKET</span>
                </label>
              </div>
              <input
                type="number"
                value={pricingType === "MARKET" ? displayPrice.toFixed(2) : limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                disabled={pricingType === "MARKET"}
                placeholder={displayPrice.toFixed(2)}
                className={`w-full h-10 bg-transparent border px-4 text-center font-[var(--font-anton)] text-lg text-white outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  pricingType === "MARKET" ? "text-white/40 border-white/10 cursor-not-allowed" : "border-white/20 focus:border-white"
                }`}
              />
            </div>

            {/* Quantity */}
            <div className="pt-5">
              <label className="text-[10px] tracking-[0.1em] text-white/40 mb-2 block">QTY</label>
              <div className="flex items-center border border-white/20">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  {"\u2212"}
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 h-10 bg-transparent text-center font-[var(--font-anton)] text-lg text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setQty(qty + 1)}
                  className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  {"+"}
                </button>
              </div>

              <div className="flex justify-between items-center mt-4 py-3 border-t border-b border-white/8">
                <span className="text-[10px] tracking-[0.1em] text-white/40">EST. TOTAL</span>
                <span className="font-[var(--font-anton)] text-xl">
                  {"\u20B9"}{(effectivePrice * qty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] tracking-[0.1em] text-white/40">BALANCE</span>
                <span className="font-[var(--font-anton)] text-sm">{"\u20B9"}{Math.round(balance).toLocaleString("en-IN")}</span>
              </div>

              <motion.button
                onClick={handleOrder}
                whileTap={{ scale: 0.97 }}
                className={`w-full h-11 mt-5 text-[10px] tracking-[0.15em] font-semibold border transition-all duration-150 ${
                  buySellTab === "BUY"
                    ? "bg-[#00D26A] text-black border-[#00D26A] hover:bg-transparent hover:text-[#00D26A]"
                    : "bg-[#FF5252] text-white border-[#FF5252] hover:bg-transparent hover:text-[#FF5252]"
                }`}
              >
                {pricingType === "LIMIT" ? `${buySellTab} LIMIT` : buySellTab} {stock.ticker}
              </motion.button>
            </div>
            </div>

            {/* Order Book */}
            {orderBook && (
              <div className="border border-white/10">
                <div className="px-4 py-3 border-b border-white/8">
                  <p className="text-[9px] tracking-[0.15em] text-white/30">ORDER BOOK</p>
                </div>
                <div className="grid grid-cols-3 gap-0 px-4 py-2 border-b border-white/6">
                  <span className="text-[8px] tracking-[0.1em] text-white/20">BID</span>
                  <span className="text-[8px] tracking-[0.1em] text-white/20 text-center">QTY</span>
                  <span className="text-[8px] tracking-[0.1em] text-white/20 text-right">ORDERS</span>
                </div>
                {orderBook.bids.map((b, i) => (
                  <div key={`bid-${i}`} className="grid grid-cols-3 gap-0 px-4 py-1.5 border-b border-white/4">
                    <span className="text-[10px] text-[#00D26A] font-[var(--font-anton)]">{"\u20B9"}{b.price.toLocaleString("en-IN")}</span>
                    <span className="text-[10px] text-white/50 text-center">{b.qty}</span>
                    <span className="text-[10px] text-white/30 text-right">{b.orders}</span>
                  </div>
                ))}
                <div className="px-4 py-2 bg-white/[0.03] border-y border-white/8">
                  <p className="text-[10px] text-white/40 text-center font-[var(--font-anton)]">
                    {"\u20B9"}{displayPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })} LTP
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-0 px-4 py-2 border-b border-white/6">
                  <span className="text-[8px] tracking-[0.1em] text-white/20">ASK</span>
                  <span className="text-[8px] tracking-[0.1em] text-white/20 text-center">QTY</span>
                  <span className="text-[8px] tracking-[0.1em] text-white/20 text-right">ORDERS</span>
                </div>
                {orderBook.asks.map((a, i) => (
                  <div key={`ask-${i}`} className="grid grid-cols-3 gap-0 px-4 py-1.5 border-b border-white/4">
                    <span className="text-[10px] text-[#FF5252] font-[var(--font-anton)]">{"\u20B9"}{a.price.toLocaleString("en-IN")}</span>
                    <span className="text-[10px] text-white/50 text-center">{a.qty}</span>
                    <span className="text-[10px] text-white/30 text-right">{a.orders}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Stock News — hidden if empty */}
            {stockNews.length > 0 && (
            <div>
              <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-3">NEWS</h3>
                <div className="space-y-2">
                  {stockNews.map(news => (
                    <Link key={news.id} href={`/news/${news.id}`} className="block border border-white/8 p-4 hover:bg-white/[0.02] transition-colors">
                      <p className="text-[11px] text-white/60 leading-relaxed mb-2">{news.headline}</p>
                      <div className="flex items-center gap-3">
                        {news.published_at && (
                          <span className="text-[9px] tracking-[0.1em] text-white/25">
                            {new Date(news.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium ${news.sentiment > 0.1 ? "text-[#00D26A]" : news.sentiment < -0.1 ? "text-[#FF5252]" : "text-white/30"}`}>
                          {news.sentiment > 0.1 ? "BULLISH" : news.sentiment < -0.1 ? "BEARISH" : "NEUTRAL"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
            </div>
            )}

            {/* Stock Events — hidden if empty */}
            {stock.events && stock.events.length > 0 && (
            <div>
              <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-3">UPCOMING EVENTS</h3>
                <div className="space-y-2">
                  {stock.events.map((event, i) => {
                    const typeColors: Record<string, string> = {
                      RESULTS: "text-[#00D26A] border-[#00D26A]/30 bg-[#00D26A]/5",
                      AGM: "text-blue-400 border-blue-400/30 bg-blue-400/5",
                      DIVIDEND: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
                      EVENT: "text-white/50 border-white/20 bg-white/5",
                    };
                    return (
                      <div key={i} className="border border-white/8 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[7px] tracking-[0.15em] font-semibold px-1.5 py-0.5 border ${typeColors[event.type] || typeColors.EVENT}`}>
                            {event.type}
                          </span>
                          <p className="text-[11px] text-white/60">{event.title}</p>
                        </div>
                        <span className="text-[9px] tracking-[0.1em] text-white/25 whitespace-nowrap ml-3">
                          {new Date(event.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
            </div>
            )}

            {/* Order History */}
            {tickerOrders.length > 0 && (
              <div>
                <h3 className="font-[var(--font-anton)] text-sm tracking-[0.1em] uppercase mb-3">
                  YOUR ORDERS ({tickerOrders.length})
                </h3>
                <div className="space-y-2">
                  {tickerOrders.map((order) => (
                    <div key={order.id} className="border border-white/8 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] tracking-[0.15em] font-semibold px-1.5 py-0.5 border ${
                          order.type === "BUY"
                            ? "text-[#00D26A] border-[#00D26A]/30 bg-[#00D26A]/5"
                            : "text-[#FF5252] border-[#FF5252]/30 bg-[#FF5252]/5"
                        }`}>
                          {order.type}
                        </span>
                        <div>
                          <p className="text-[10px] text-white/50">{order.qty} @ {"\u20B9"}{order.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                          <p className="text-[8px] text-white/25 mt-0.5">
                            {order.status !== "COMPLETED" && <span className="text-yellow-400 mr-1">{order.status}</span>}
                            {order.orderType} {"\u00B7"} {new Date(order.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <p className="font-[var(--font-anton)] text-[12px]">{"\u20B9"}{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>{/* end sticky */}
        </aside>
      </div>

      {/* Mobile order panel overlay */}
      <Portal>
      <AnimatePresence>
        {mobileOrderOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOrderOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden bg-bg border-t border-white/10 max-h-[85dvh] overflow-hidden flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-[var(--font-anton)] text-base tracking-[0.05em]">{stock.ticker}</span>
                  <span className="text-[10px] text-white/40">{"\u20B9"}{displayPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <button onClick={() => setMobileOrderOpen(false)} className="w-10 h-10 flex items-center justify-center border border-white/15 hover:border-white/40 transition-colors">
                  <X size={14} className="text-white/50" />
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex gap-0 px-2 pt-2 shrink-0">
                {(["ORDER", "BOOK", "HISTORY"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMobileTab(tab)}
                    className={`flex-1 py-2.5 text-[11px] tracking-[0.15em] border-b-2 transition-all duration-300 ${
                      mobileTab === tab
                        ? "text-white border-white"
                        : "text-white/40 border-transparent hover:text-white/60"
                    }`}
                  >
                    {tab === "BOOK" ? "ORDER BOOK" : tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="overflow-y-auto flex-1" style={{ height: '420px' }}>
                <AnimatePresence mode="wait" initial={false}>
                {mobileTab === "ORDER" && (
                  <motion.div
                    key="ORDER"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                    className="px-5 py-5 space-y-5 h-[420px] overflow-y-auto"
                  >
                    {/* Buy/Sell toggle */}
                    <div className="flex gap-0">
                      <button
                        onClick={() => setBuySellTab("BUY")}
                        className={`flex-1 py-2 text-[10px] tracking-[0.15em] font-medium border-b-2 transition-all duration-300 ${buySellTab === "BUY" ? "text-[#00D26A] border-[#00D26A] bg-[#00D26A]/10" : "text-white/40 border-transparent hover:text-white/60"}`}
                      >BUY</button>
                      <button
                        onClick={() => setBuySellTab("SELL")}
                        className={`flex-1 py-2 text-[10px] tracking-[0.15em] font-medium border-b-2 transition-all duration-300 ${buySellTab === "SELL" ? "text-[#FF5252] border-[#FF5252] bg-[#FF5252]/10" : "text-white/40 border-transparent hover:text-white/60"}`}
                      >SELL</button>
                    </div>

                    {/* Order type */}
                    <div className="flex gap-0">
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

                    {/* Price input + market checkbox */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] tracking-[0.1em] text-white/40">PRICE</label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={pricingType === "MARKET"}
                            onChange={(e) => {
                              if (e.target.checked) { setPricingType("MARKET"); setLimitPrice(""); }
                              else { setPricingType("LIMIT"); setLimitPrice(displayPrice.toFixed(2)); }
                            }}
                            className="w-3 h-3 accent-white"
                          />
                          <span className="text-[9px] tracking-[0.15em] text-white/50">MARKET</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        value={pricingType === "MARKET" ? displayPrice.toFixed(2) : limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        disabled={pricingType === "MARKET"}
                        placeholder={displayPrice.toFixed(2)}
                        className={`w-full h-10 bg-transparent border px-4 text-center font-[var(--font-anton)] text-lg text-white outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          pricingType === "MARKET" ? "text-white/40 border-white/10 cursor-not-allowed" : "border-white/20 focus:border-white"
                        }`}
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="text-[10px] tracking-[0.1em] text-white/40 mb-2 block">QTY</label>
                      <div className="flex items-center border border-white/20">
                        <button
                          onClick={() => setQty(Math.max(1, qty - 1))}
                          className="w-12 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                        >{"\u2212"}</button>
                        <input
                          type="number"
                          value={qty}
                          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 h-10 bg-transparent text-center font-[var(--font-anton)] text-lg text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => setQty(qty + 1)}
                          className="w-12 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                        >{"+"}</button>
                      </div>
                    </div>

                    {/* Total + Balance */}
                    <div className="border-t border-b border-white/8 py-3 flex justify-between items-center">
                      <span className="text-[10px] tracking-[0.1em] text-white/40">EST. TOTAL</span>
                      <span className="font-[var(--font-anton)] text-xl">
                        {"\u20B9"}{(effectivePrice * qty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] tracking-[0.1em] text-white/40">BALANCE</span>
                      <span className="font-[var(--font-anton)] text-sm">{"\u20B9"}{Math.round(balance).toLocaleString("en-IN")}</span>
                    </div>

                  </motion.div>
                )}

                {mobileTab === "BOOK" && orderBook && (
                  <motion.div
                    key="BOOK"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                    className="px-4 py-4 h-[420px] overflow-y-auto"
                  >
                    <div className="grid grid-cols-3 gap-0 px-2 py-2 border-b border-white/6">
                      <span className="text-[8px] tracking-[0.1em] text-white/20">BID</span>
                      <span className="text-[8px] tracking-[0.1em] text-white/20 text-center">QTY</span>
                      <span className="text-[8px] tracking-[0.1em] text-white/20 text-right">ORDERS</span>
                    </div>
                    {orderBook.bids.map((b, i) => (
                      <div key={`m-bid-${i}`} className="grid grid-cols-3 gap-0 px-2 py-2 border-b border-white/4">
                        <span className="text-[11px] text-[#00D26A] font-[var(--font-anton)]">{"\u20B9"}{b.price.toLocaleString("en-IN")}</span>
                        <span className="text-[11px] text-white/50 text-center">{b.qty}</span>
                        <span className="text-[11px] text-white/30 text-right">{b.orders}</span>
                      </div>
                    ))}
                    <div className="px-2 py-2.5 bg-white/[0.03] border-y border-white/8 text-center">
                      <span className="text-[11px] text-white/40 font-[var(--font-anton)]">
                        {"\u20B9"}{displayPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })} LTP
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-0 px-2 py-2 border-b border-white/6">
                      <span className="text-[8px] tracking-[0.1em] text-white/20">ASK</span>
                      <span className="text-[8px] tracking-[0.1em] text-white/20 text-center">QTY</span>
                      <span className="text-[8px] tracking-[0.1em] text-white/20 text-right">ORDERS</span>
                    </div>
                    {orderBook.asks.map((a, i) => (
                      <div key={`m-ask-${i}`} className="grid grid-cols-3 gap-0 px-2 py-2 border-b border-white/4">
                        <span className="text-[11px] text-[#FF5252] font-[var(--font-anton)]">{"\u20B9"}{a.price.toLocaleString("en-IN")}</span>
                        <span className="text-[11px] text-white/50 text-center">{a.qty}</span>
                        <span className="text-[11px] text-white/30 text-right">{a.orders}</span>
                      </div>
                    ))}
                  </motion.div>
                )}

                {mobileTab === "HISTORY" && (
                  <motion.div
                    key="HISTORY"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                    className="px-4 py-4 h-[420px] overflow-y-auto"
                  >
                    {tickerOrders.length > 0 ? (
                      <div className="space-y-2">
                        {tickerOrders.map((order) => (
                          <div key={order.id} className="border border-white/8 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] tracking-[0.15em] font-semibold px-1.5 py-0.5 border ${
                                order.type === "BUY"
                                  ? "text-[#00D26A] border-[#00D26A]/30 bg-[#00D26A]/5"
                                  : "text-[#FF5252] border-[#FF5252]/30 bg-[#FF5252]/5"
                              }`}>
                                {order.type}
                              </span>
                              <div>
                                <p className="text-[10px] text-white/50">{order.qty} @ {"\u20B9"}{order.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                <p className="text-[8px] text-white/25 mt-0.5">
                                  {order.status !== "COMPLETED" && <span className="text-yellow-400 mr-1">{order.status}</span>}
                                  {order.orderType} {"\u00B7"} {new Date(order.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                </p>
                              </div>
                            </div>
                            <p className="font-[var(--font-anton)] text-[12px]">{"\u20B9"}{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-[11px] tracking-[0.1em] text-white/20">NO ORDERS YET</p>
                      </div>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              {/* Sticky confirm button — always rendered to keep panel height constant */}
              <div className={`shrink-0 px-5 py-4 border-t border-white/8 bg-bg ${mobileTab !== "ORDER" ? "invisible pointer-events-none" : ""}`}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleOrder}
                    className={`w-full h-12 text-[11px] tracking-[0.15em] font-semibold border transition-all duration-150 ${
                      buySellTab === "BUY"
                        ? "bg-[#00D26A] text-black border-[#00D26A] hover:bg-transparent hover:text-[#00D26A]"
                        : "bg-[#FF5252] text-white border-[#FF5252] hover:bg-transparent hover:text-[#FF5252]"
                    }`}
                  >
                    {pricingType === "LIMIT" ? `${buySellTab} LIMIT` : buySellTab} {stock.ticker}
                  </motion.button>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </Portal>

      {/* Order confirm modal */}
      <Portal>
      <OrderConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); executeOrder(); setMobileOrderOpen(false); }}
        type={buySellTab}
        ticker={stock.ticker}
        qty={qty}
        price={effectivePrice}
        pricingType={pricingType}
        total={effectivePrice * qty}
      />
      </Portal>
    </div>
  );
}
