"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Clock, CheckCircle, ArrowLeft, Minus, Plus, X,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getIpoListings, getMyIpoApplications, applyForIpo, withdrawIpoApplication,
  type IpoListing, type IpoApplication,
} from "@/lib/api";
import Portal from "@/components/Portal";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function IPOPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [myApps, setMyApps] = useState<IpoApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lots, setLots] = useState(1);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getIpoListings().then(res => {
      if (res.data && res.data.length > 0) {
        setIpos(res.data);
        setSelectedId(res.data[0].id);
      }
      setLoading(false);
    });
    if (isLoggedIn) {
      getMyIpoApplications().then(res => {
        if (res.data) setMyApps(res.data);
      });
    }
  }, [isLoggedIn]);

  const selected = ipos.find(i => i.id === selectedId) ?? ipos[0] ?? null;
  const liveCount = ipos.filter(i => i.status === "LIVE").length;
  const myApp = selected ? myApps.find(a => a.ipo_id === selected.id) : null;
  const isApplied = !!myApp;

  const lotPrice = selected ? selected.lot_size * selected.price_band_high : 0;
  const totalCost = lotPrice * lots;
  const totalShares = selected ? selected.lot_size * lots : 0;

  function handleSelect(id: string) {
    setSelectedId(id);
    setLots(1);
    setMobileDetailOpen(true);
  }

  async function handleApply() {
    if (!selected || applying) return;
    setApplying(true);
    const res = await applyForIpo(selected.id, lots);
    if (res.status === 201 || res.data?.ok) {
      setMyApps(prev => [...prev, {
        application_id: "",
        ipo_id: selected.id,
        lots_applied: lots,
        lots_allotted: null,
        amount_blocked: totalCost,
        application_status: "APPLIED",
        applied_at: new Date().toISOString(),
        ticker: selected.ticker,
        name: selected.name,
      }]);
      setToast(`Applied for ${lots} lot${lots > 1 ? "s" : ""} of ${selected.name}`);
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast(res.error ?? "Application failed");
      setTimeout(() => setToast(null), 4000);
    }
    setApplying(false);
  }

  async function handleWithdraw() {
    if (!selected || !myApp) return;
    const res = await withdrawIpoApplication(selected.id);
    if (res.data?.ok) {
      setMyApps(prev => prev.filter(a => a.ipo_id !== selected.id));
      setToast("Application withdrawn");
      setTimeout(() => setToast(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="py-6">
        <h1 className="font-[var(--font-anton)] text-xl tracking-[0.1em] uppercase mb-8">IPO</h1>
        <p className="text-[11px] text-white/25 animate-pulse tracking-[0.1em]">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-11 h-11 border border-white/20 flex items-center justify-center hover:border-white active:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="font-[var(--font-anton)] text-xl tracking-[0.1em] uppercase">IPO</h1>
            <p className="text-[9px] tracking-[0.15em] text-white/25 mt-0.5">INITIAL PUBLIC OFFERINGS</p>
          </div>
        </div>
        {liveCount > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-up/10 border border-up/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full bg-up opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 bg-up" />
            </span>
            <span className="text-[9px] tracking-[0.12em] text-up font-semibold">{liveCount} LIVE</span>
          </span>
        )}
      </div>

      {ipos.length === 0 ? (
        <p className="text-[11px] text-white/25 py-16 text-center tracking-[0.1em]">NO ACTIVE IPOs AT THIS TIME</p>
      ) : (
        <div className="md:grid md:grid-cols-[5fr_7fr] md:gap-0 md:border md:border-white/8">
          {/* Left: IPO list */}
          <div className="md:border-r md:border-white/8">
            <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-white/8">
              <span className="text-[9px] tracking-[0.15em] text-white/30">{ipos.length} ISSUES</span>
            </div>
            <div className="space-y-0">
              {ipos.map(ipo => {
                const isActive = ipo.id === selectedId;
                const applied = myApps.some(a => a.ipo_id === ipo.id);
                return (
                  <button
                    key={ipo.id}
                    onClick={() => handleSelect(ipo.id)}
                    className={`w-full text-left transition-colors border-b border-white/6 ${
                      isActive ? "bg-white/[0.04] md:border-l-2 md:border-l-white" : "hover:bg-white/[0.02] md:border-l-2 md:border-l-transparent"
                    }`}
                  >
                    <div className="px-4 py-4 md:px-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 border border-white/15 flex items-center justify-center shrink-0">
                            <span className="text-[9px] tracking-[0.08em] text-white/40 font-medium">
                              {ipo.ticker.slice(0, 3)}
                            </span>
                          </div>
                          <div>
                            <p className="font-[var(--font-anton)] text-[13px] tracking-[0.04em]">{ipo.name}</p>
                            <p className="text-[9px] text-white/25 mt-0.5">
                              {ipo.ticker} · {formatDate(ipo.open_date)} — {formatDate(ipo.close_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[8px] tracking-[0.12em] px-2 py-0.5 font-semibold ${
                            ipo.status === "LIVE" ? "bg-up/15 text-up"
                            : ipo.status === "CLOSED" ? "bg-white/5 text-white/25"
                            : "bg-white/5 text-white/40"
                          }`}>
                            {ipo.status}
                          </span>
                          {applied && <span className="text-[8px] tracking-[0.1em] text-up/60">APPLIED</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        <div>
                          <p className="text-[8px] tracking-[0.1em] text-white/20">PRICE BAND</p>
                          <p className="text-[11px] text-white/60 mt-0.5">
                            ₹{ipo.price_band_low} — ₹{ipo.price_band_high}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] tracking-[0.1em] text-white/20">LOT</p>
                          <p className="text-[11px] text-white/60 mt-0.5">{ipo.lot_size} shares</p>
                        </div>
                        <div>
                          <p className="text-[8px] tracking-[0.1em] text-white/20">
                            {ipo.status === "LIVE" ? "SUBS" : "SECTOR"}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${ipo.status === "LIVE" ? "text-up" : "text-white/40"}`}>
                            {ipo.status === "LIVE" && ipo.subscription_times !== null
                              ? `${ipo.subscription_times.toFixed(1)}x`
                              : ipo.sector}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Detail (desktop) */}
          {selected && (
            <div className="hidden md:block">
              <IPODetail
                ipo={selected}
                lots={lots}
                setLots={setLots}
                totalCost={totalCost}
                totalShares={totalShares}
                lotPrice={lotPrice}
                isApplied={isApplied}
                applying={applying}
                onApply={handleApply}
                onWithdraw={handleWithdraw}
                isLoggedIn={isLoggedIn}
              />
            </div>
          )}

          {/* Mobile bottom sheet */}
          <Portal>
            <AnimatePresence>
              {mobileDetailOpen && selected && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                  onClick={() => setMobileDetailOpen(false)}
                >
                  <motion.div
                    initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 max-h-[92dvh] bg-[#0a0a0a] border-t border-white/10 overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                  >
                    <div className="sticky top-0 bg-[#0a0a0a] z-10 flex items-center justify-between px-5 py-3 border-b border-white/8">
                      <span className="font-[var(--font-anton)] text-sm tracking-[0.06em]">{selected.name}</span>
                      <button onClick={() => setMobileDetailOpen(false)} className="w-10 h-10 flex items-center justify-center border border-white/15">
                        <X size={14} />
                      </button>
                    </div>
                    <IPODetail
                      ipo={selected}
                      lots={lots}
                      setLots={setLots}
                      totalCost={totalCost}
                      totalShares={totalShares}
                      lotPrice={lotPrice}
                      isApplied={isApplied}
                      applying={applying}
                      onApply={handleApply}
                      onWithdraw={handleWithdraw}
                      isLoggedIn={isLoggedIn}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </Portal>
        </div>
      )}

      <Portal>
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 -translate-x-1/2 z-[100] px-5 py-3 bg-up text-black text-[11px] tracking-[0.08em] font-semibold flex items-center gap-2"
              style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
            >
              <CheckCircle size={14} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

function IPODetail({
  ipo, lots, setLots, totalCost, totalShares, lotPrice,
  isApplied, applying, onApply, onWithdraw, isLoggedIn,
}: {
  ipo: IpoListing;
  lots: number;
  setLots: (n: number) => void;
  totalCost: number;
  totalShares: number;
  lotPrice: number;
  isApplied: boolean;
  applying: boolean;
  onApply: () => void;
  onWithdraw: () => void;
  isLoggedIn: boolean;
}) {
  return (
    <div className="divide-y divide-white/6">
      {/* Header */}
      <div className="px-5 py-5 md:px-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-[var(--font-anton)] text-lg tracking-[0.06em]">{ipo.name}</h2>
            <p className="text-[10px] text-white/30 mt-0.5">
              {ipo.ticker} · {ipo.sector}
            </p>
          </div>
          <span className={`text-[8px] tracking-[0.12em] px-2 py-1 font-semibold ${
            ipo.status === "LIVE" ? "bg-up/15 text-up" : "bg-white/5 text-white/40"
          }`}>
            {ipo.status}
          </span>
        </div>
        <p className="text-[11px] text-white/35 leading-relaxed">
          {formatDate(ipo.open_date)} — {formatDate(ipo.close_date)}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-white/6">
        {[
          { label: "PRICE BAND", value: `₹${ipo.price_band_low.toLocaleString("en-IN")} — ₹${ipo.price_band_high.toLocaleString("en-IN")}` },
          { label: "LOT SIZE", value: `${ipo.lot_size} shares` },
          { label: "LOT PRICE", value: `₹${lotPrice.toLocaleString("en-IN")}` },
          { label: "MAX LOTS", value: `${ipo.max_lots_per_investor}` },
        ].map(m => (
          <div key={m.label} className="bg-[#0a0a0a] px-4 py-3 md:px-5 md:py-4">
            <p className="text-[8px] tracking-[0.15em] text-white/20 mb-1">{m.label}</p>
            <p className="font-[var(--font-anton)] text-sm">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Subscription status (LIVE) */}
      {ipo.status === "LIVE" && ipo.subscription_times !== null && (
        <div className="px-5 py-5 md:px-6">
          <p className="text-[9px] tracking-[0.15em] text-white/25 mb-4">SUBSCRIPTION STATUS</p>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/40">Overall</span>
              <span className="text-[11px] text-white/70 font-medium">{ipo.subscription_times.toFixed(1)}x</span>
            </div>
            <div className="h-1.5 bg-white/8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (ipo.subscription_times / 5) * 100)}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-up/60"
              />
            </div>
          </div>
        </div>
      )}

      {/* Upcoming notice */}
      {ipo.status === "UPCOMING" && (
        <div className="px-5 py-5 md:px-6">
          <div className="flex flex-col items-center justify-center py-8 border border-white/6">
            <Clock size={20} className="text-white/15 mb-2" />
            <p className="text-[11px] text-white/30 mb-1">Opens {formatDate(ipo.open_date)}</p>
            <p className="text-[9px] text-white/15">{formatDate(ipo.open_date)} — {formatDate(ipo.close_date)}</p>
          </div>
        </div>
      )}

      {/* Listed notice */}
      {ipo.status === "LISTED" && ipo.opening_price && (
        <div className="px-5 py-5 md:px-6">
          <div className="flex flex-col items-center justify-center py-6 border border-up/20 bg-up/5">
            <p className="text-[11px] text-up mb-1">NOW TRADING</p>
            <p className="font-[var(--font-anton)] text-xl">₹{ipo.opening_price.toLocaleString("en-IN")}</p>
            <p className="text-[9px] text-white/30 mt-1">OPENING PRICE</p>
          </div>
        </div>
      )}

      {/* Application panel (LIVE + logged in) */}
      {ipo.status === "LIVE" && isLoggedIn && (
        <div className="px-5 py-5 md:px-6">
          <p className="text-[9px] tracking-[0.15em] text-white/25 mb-4">
            {isApplied ? "YOUR APPLICATION" : "APPLY FOR IPO"}
          </p>
          {!isApplied ? (
            <>
              <div className="mb-4">
                <label className="text-[10px] tracking-[0.1em] text-white/40 mb-2 block">NO. OF LOTS</label>
                <div className="flex items-center border border-white/20">
                  <button
                    onClick={() => setLots(Math.max(1, lots - 1))}
                    className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    value={lots}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 1;
                      setLots(Math.max(1, Math.min(ipo.max_lots_per_investor, v)));
                    }}
                    className="flex-1 h-10 bg-transparent text-center font-[var(--font-anton)] text-lg text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setLots(Math.min(ipo.max_lots_per_investor, lots + 1))}
                    className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <p className="text-[8px] tracking-[0.1em] text-white/20 mt-1.5">
                  MAX {ipo.max_lots_per_investor} LOTS · {ipo.lot_size} SHARES PER LOT
                </p>
              </div>

              <div className="space-y-0 mb-4">
                {[
                  { label: "Lot Price", value: `₹${lotPrice.toLocaleString("en-IN")}` },
                  { label: "Lots", value: String(lots) },
                  { label: "Total Shares", value: String(totalShares) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-white/6">
                    <span className="text-[10px] text-white/40">{row.label}</span>
                    <span className="text-[11px] text-white/60">{row.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 border-b border-white/8">
                  <span className="text-[10px] tracking-[0.1em] text-white/50 font-medium">TOTAL COST</span>
                  <span className="font-[var(--font-anton)] text-xl">₹{totalCost.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <motion.button
                onClick={onApply}
                whileTap={{ scale: 0.97 }}
                disabled={applying}
                className="w-full h-11 text-[10px] tracking-[0.15em] font-semibold border transition-all duration-300 bg-up text-black border-up hover:bg-transparent hover:text-up disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? "APPLYING..." : `APPLY FOR ${lots} LOT${lots > 1 ? "S" : ""} · ₹${totalCost.toLocaleString("en-IN")}`}
              </motion.button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 border border-up/20 bg-up/5">
              <CheckCircle size={24} className="text-up mb-2" />
              <p className="text-[11px] tracking-[0.1em] text-up font-medium mb-1">APPLICATION SUBMITTED</p>
              <p className="text-[9px] text-white/25 mb-4">Allotment status will be updated after closing date</p>
              <button
                onClick={onWithdraw}
                className="text-[9px] tracking-[0.1em] text-white/30 hover:text-down transition-colors border border-white/10 hover:border-down/30 px-4 py-2"
              >
                WITHDRAW APPLICATION
              </button>
            </div>
          )}
        </div>
      )}

      {/* Not logged in */}
      {ipo.status === "LIVE" && !isLoggedIn && (
        <div className="px-5 py-5 md:px-6">
          <div className="flex items-center justify-center h-11 border border-white/8 text-white/25 text-[10px] tracking-[0.15em]">
            LOG IN TO APPLY
          </div>
        </div>
      )}

      {/* Closed */}
      {ipo.status === "CLOSED" && (
        <div className="px-5 py-5 md:px-6">
          <div className="flex items-center justify-center h-11 border border-white/6 text-white/20 text-[10px] tracking-[0.15em]">
            ISSUE CLOSED — ALLOTMENT PENDING
          </div>
        </div>
      )}
    </div>
  );
}
