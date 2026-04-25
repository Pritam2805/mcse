"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingScreen from "./LoadingScreen";
import TopNav from "./TopNav";
import TickerTape from "./TickerTape";
import AnnouncementBanner from "./AnnouncementBanner";
import MarketClosedBanner from "./MarketClosedBanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("mcse-booted")) {
      return false;
    }
    return true;
  });

  const handleDone = useCallback(() => {
    setLoading(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mcse-booted", "1");
    }
  }, []);

  // Safety-net: force-dismiss the loading screen after 5s no matter what,
  // so a single broken animation / JS error on one client can't freeze boot.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => handleDone(), 5000);
    return () => clearTimeout(t);
  }, [loading, handleDone]);

  return (
    <>
      <AnimatePresence>
        {loading && <LoadingScreen onDone={handleDone} />}
      </AnimatePresence>

      <div
        className={`relative flex flex-col overflow-hidden transition-opacity duration-700 ease-out ${loading ? "opacity-0" : "opacity-100"}`}
        style={{ height: '100dvh' }}
      >
        {/* Grain overlay */}
        <div
          className="grain-overlay fixed inset-0 z-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
            mixBlendMode: "overlay",
          }}
        />

        {/* Abstract geometric accent */}
        <div className="circuit-overlay fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="circuit" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <path d="M60 0 L60 30 M60 90 L60 120 M0 60 L30 60 M90 60 L120 60" stroke="white" strokeWidth="0.5" fill="none" />
                <circle cx="60" cy="60" r="3" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="60" cy="30" r="1.5" fill="white" />
                <circle cx="60" cy="90" r="1.5" fill="white" />
                <circle cx="30" cy="60" r="1.5" fill="white" />
                <circle cx="90" cy="60" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#circuit)" />
          </svg>
        </div>

        <div className="shrink-0 z-50">
          <TopNav />
          <MarketClosedBanner />
          <TickerTape />
          <AnnouncementBanner />
        </div>
        <main className="flex-1 overflow-y-auto relative z-10" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}>
          <div className="max-w-[1280px] mx-auto w-full px-4 md:px-6 lg:px-12 mobile-content-pad">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
