"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, LogOut, Shield, HelpCircle, ArrowLeft, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useTrading } from "@/lib/TradingContext";
import { usePreferences, type Preferences } from "@/lib/PreferencesContext";
import Portal from "@/components/Portal";

const PREF_ITEMS: { key: keyof Preferences; label: string }[] = [
  { key: "notifications", label: "NOTIFICATIONS" },
  { key: "emailAlerts", label: "EMAIL ALERTS" },
  { key: "darkMode", label: "DARK MODE" },
  { key: "confirmOrders", label: "CONFIRM BEFORE ORDER" },
];

export default function ProfileDropdown({ onClose }: { onClose: () => void }) {
  // Two refs — mobile modal (rendered via Portal) + desktop dropdown.
  // Both modals are in the DOM simultaneously, just hidden via Tailwind
  // breakpoints, so the click-outside check must consider BOTH.
  const mobileRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const { logout, userName, userEmail, role } = useAuth();
  const { balance } = useTrading();
  const prefs = usePreferences();
  const router = useRouter();

  const initials = userName ? userName.split(" ").map(w => w[0]).join("").slice(0, 2) : "?";

  useEffect(() => {
    // Defer attaching the listener by one tick so the same click that
    // opened the dropdown doesn't immediately close it.
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      document.addEventListener("mousedown", handleClick);
    }, 0);

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideMobile = mobileRef.current?.contains(target) ?? false;
      const insideDesktop = desktopRef.current?.contains(target) ?? false;
      if (!insideMobile && !insideDesktop) {
        onClose();
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  async function handleLogout() {
    // Close the dropdown first so its exit animation starts before the
    // auth state flips and TopNav re-renders to LOG IN.
    onClose();

    // Clear local + server session.
    await logout();

    // Hard navigate so ALL React state (TradingContext polls, cached
    // portfolio, open websockets, etc.) resets cleanly. router.push()
    // would leave stale intervals + queries running under the logged-out
    // user and cause visible flicker.
    if (typeof window !== "undefined") {
      window.location.replace("/");
    } else {
      router.replace("/");
    }
  }

  const menuItems = [
    ...(role === "company" || role === "admin"
      ? [{ icon: Shield, label: role === "admin" ? "ADMIN DASHBOARD" : "COMPANY DASHBOARD", href: "/admin" }]
      : []),
    { icon: HelpCircle, label: "SUPPORT", href: "/support" },
  ];

  const mobileModal = (
    <motion.div
      ref={mobileRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="md:hidden fixed inset-0 bg-bg z-[60] flex flex-col overflow-y-auto"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="w-10 h-10 flex items-center justify-center active:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft size={20} className="text-white/60" />
          </button>
          <span className="text-[10px] tracking-[0.15em] text-white/40">PROFILE</span>
          <div className="w-10" />
        </div>

        {/* Avatar + Name centered */}
        <div className="flex flex-col items-center py-8 px-6">
          <div className="w-20 h-20 border-2 border-white/20 flex items-center justify-center mb-4">
            <span className="font-[var(--font-anton)] text-xl tracking-wider">{initials}</span>
          </div>
          <p className="font-[var(--font-anton)] text-lg tracking-[0.08em]">{userName}</p>
          <p className="text-[11px] text-white/30 mt-1">{userEmail}</p>
          {role && role !== "user" && (
            <span className="mt-2 text-[8px] tracking-[0.12em] px-2.5 py-1 border border-white/15 text-white/40 uppercase">
              {role === "company" ? "COMPANY" : "ADMIN"}
            </span>
          )}
        </div>

        {/* Balance card */}
        <div className="mx-4 mb-4 border border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet size={16} className="text-white/30" />
            <span className="text-[10px] tracking-[0.12em] text-white/40">BALANCE</span>
          </div>
          <span className="font-[var(--font-anton)] text-lg tracking-[0.03em]">
            {"\u20B9"}{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Menu items */}
        <div className="mx-4 border border-white/10 mb-4">
          {menuItems.map((item, i) => (
            <Link key={item.label} href={item.href} onClick={onClose}>
              <div className={`flex items-center gap-4 px-5 py-4 active:bg-white/[0.04] transition-colors ${i < menuItems.length - 1 ? "border-b border-white/6" : ""}`}>
                <item.icon size={18} className="text-white/30 shrink-0" />
                <span className="text-[12px] tracking-[0.08em] text-white/60 flex-1">{item.label}</span>
                <ChevronRight size={14} className="text-white/15" />
              </div>
            </Link>
          ))}
        </div>

        {/* Preferences */}
        <p className="px-5 text-[9px] tracking-[0.2em] text-white/25 uppercase mb-2">PREFERENCES</p>
        <div className="mx-4 border border-white/10 mb-4">
          {PREF_ITEMS.map((item, i) => (
            <div
              key={item.key}
              className={`flex items-center justify-between px-5 py-4 ${
                i < PREF_ITEMS.length - 1 ? "border-b border-white/6" : ""
              }`}
            >
              <span className="text-[12px] tracking-[0.08em] text-white/60 flex-1">{item.label}</span>
              <button
                onClick={() => prefs.togglePref(item.key)}
                role="switch"
                aria-checked={prefs[item.key]}
                aria-label={`Toggle ${item.label}`}
                className={`w-11 h-6 border flex items-center shrink-0 transition-all duration-200 ${
                  prefs[item.key]
                    ? "bg-white/10 border-white/30"
                    : "bg-transparent border-white/15"
                }`}
              >
                <div className={`w-4 h-4 transition-all duration-200 ${
                  prefs[item.key]
                    ? "bg-white ml-[calc(100%-1.25rem)]"
                    : "bg-white/20 ml-0.5"
                }`} />
              </button>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="mx-4 mb-4 border border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-down/[0.06] transition-colors"
          >
            <LogOut size={18} className="text-down/50" />
            <span className="text-[12px] tracking-[0.12em] text-down/60">LOG OUT</span>
          </button>
        </div>
    </motion.div>
  );

  return (
    <>
      <Portal>{mobileModal}</Portal>

      {/* Desktop: Compact dropdown */}
      <motion.div
        ref={desktopRef}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="hidden md:block absolute right-0 top-10 w-[min(300px,calc(100vw-2rem))] bg-bg border border-white/15 z-50"
      >
        {/* User Identity */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-white/30 flex items-center justify-center shrink-0">
              <span className="font-[var(--font-anton)] text-[11px] tracking-wider">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-[var(--font-anton)] text-sm tracking-[0.08em] truncate">{userName}</p>
                {role && role !== "user" && (
                  <span className="text-[7px] tracking-[0.1em] px-1.5 py-0.5 border border-white/15 text-white/40 uppercase shrink-0">
                    {role === "company" ? "CO." : "ADMIN"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/30 truncate">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <span className="text-[9px] tracking-[0.15em] text-white/25">BALANCE</span>
          <span className="font-[var(--font-anton)] text-sm tracking-[0.03em]">
            {"\u20B9"}{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Menu */}
        <div className="py-1">
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href} onClick={onClose}>
              <div className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.04] transition-colors duration-300">
                <item.icon size={13} className="text-white/30 shrink-0" />
                <span className="text-[11px] tracking-[0.08em] text-white/45 flex-1">{item.label}</span>
                <ChevronRight size={11} className="text-white/15" />
              </div>
            </Link>
          ))}
        </div>

        {/* Preferences */}
        <div className="border-t border-white/10 py-1">
          <p className="px-5 pt-2 pb-1 text-[8px] tracking-[0.2em] text-white/25 uppercase">PREFERENCES</p>
          {PREF_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => prefs.togglePref(item.key)}
              role="switch"
              aria-checked={prefs[item.key]}
              aria-label={`Toggle ${item.label}`}
              className="w-full flex items-center gap-3.5 px-5 py-2.5 hover:bg-white/[0.04] transition-colors duration-300"
            >
              <span className="text-[11px] tracking-[0.08em] text-white/45 flex-1 text-left">{item.label}</span>
              <div
                className={`w-9 h-5 border flex items-center shrink-0 transition-all duration-200 ${
                  prefs[item.key]
                    ? "bg-white/10 border-white/30"
                    : "bg-transparent border-white/15"
                }`}
              >
                <div className={`w-3.5 h-3.5 transition-all duration-200 ${
                  prefs[item.key]
                    ? "bg-white ml-[calc(100%-1.05rem)]"
                    : "bg-white/20 ml-0.5"
                }`} />
              </div>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-down/[0.06] transition-colors duration-300 group"
          >
            <LogOut size={13} className="text-white/30 group-hover:text-down/60 transition-colors duration-300" />
            <span className="text-[10px] tracking-[0.12em] text-white/40 group-hover:text-down/70 transition-colors duration-300">LOG OUT</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}
