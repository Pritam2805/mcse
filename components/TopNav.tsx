"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Bell, BarChart3, Briefcase, Eye, Newspaper, TrendingUp, LayoutDashboard, Calendar, ClipboardCheck, Users, Package } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProfileDropdown from "./ProfileDropdown";
import NotificationDropdown from "./NotificationDropdown";
import SearchModal from "./SearchModal";
import DesktopSearch from "./DesktopSearch";
import { useAuth } from "@/lib/AuthContext";

/* Desktop tabs by role */
const userDesktopTabs = [
  { href: "/", label: "EXPLORE", icon: BarChart3 },
  { href: "/portfolio", label: "PORTFOLIO", icon: Briefcase },
  { href: "/markets", label: "MARKETS", icon: TrendingUp },
  { href: "/news", label: "NEWS", icon: Newspaper },
  { href: "/watchlist", label: "WATCHLIST", icon: Eye },
];

const companyAdminDesktopTabs = [
  { href: "/admin", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/admin/news", label: "NEWS", icon: Newspaper },
];

const totalAdminDesktopTabs = [
  { href: "/admin", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/admin/news", label: "APPROVALS", icon: ClipboardCheck },
  { href: "/admin?tab=users", label: "USERS", icon: Users },
  { href: "/admin?tab=stocks", label: "STOCKS", icon: Package },
];

/* Mobile bottom tabs by role */
const userMobileTabs = [
  { href: "/", label: "EXPLORE", icon: BarChart3 },
  { href: "/portfolio", label: "PORTFOLIO", icon: Briefcase },
  { href: "/news", label: "NEWS", icon: Newspaper },
  { href: "/watchlist", label: "WATCHLIST", icon: Eye },
];

const companyAdminMobileTabs = [
  { href: "/admin", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/admin/news", label: "NEWS", icon: Newspaper },
];

const totalAdminMobileTabs = [
  { href: "/admin", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/admin/news", label: "APPROVALS", icon: ClipboardCheck },
  { href: "/admin?tab=users", label: "USERS", icon: Users },
  { href: "/admin?tab=stocks", label: "STOCKS", icon: Package },
];

export default function TopNav() {
  return (
    <Suspense>
      <TopNavInner />
    </Suspense>
  );
}

function TopNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { isLoggedIn, authReady, userName, role } = useAuth();

  const initials = userName ? userName.split(" ").map(w => w[0]).join("").slice(0, 2) : "M";

  const desktopTabs = role === "company" ? companyAdminDesktopTabs : role === "admin" ? totalAdminDesktopTabs : userDesktopTabs;
  const mobileTabs = role === "company" ? companyAdminMobileTabs : role === "admin" ? totalAdminMobileTabs : userMobileTabs;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        // Desktop handles ⌘K inside DesktopSearch (focuses the inline input);
        // only intercept on mobile where there's no inline input.
        if (window.matchMedia("(max-width: 1023px)").matches) {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href.includes("?tab=")) {
      const [path, query] = href.split("?tab=");
      return pathname === path && searchParams.get("tab") === query;
    }
    if (href === "/admin") return pathname === "/admin" && !searchParams.get("tab");
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop + Mobile Top Nav */}
      <nav className="relative z-10 bg-bg/95 backdrop-blur-md border-b border-white/10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between h-14 px-4 md:px-6 lg:px-12">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <Image
              src="/Layer 11.png"
              alt="MCSE"
              width={32}
              height={32}
              className="w-8 h-8 object-contain logo-img"
              priority
            />
            <span className="font-[MonumentExtended] text-[13px] tracking-[0.18em] uppercase hidden sm:block">
              MCSE
            </span>
          </Link>

          {/* Center: Desktop Tabs */}
          <div className="hidden lg:flex items-stretch h-full gap-0 ml-6 lg:ml-10">
            {desktopTabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center text-[11px] tracking-[0.15em] font-medium px-5 border-b-2 transition-all duration-300 ${
                    active
                      ? "text-white border-white"
                      : "text-white/40 border-transparent hover:text-white/60"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile: button opens full-screen SearchModal */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              className="lg:hidden flex items-center gap-2 h-11 px-3 border border-white/20 hover:border-white/60 transition-colors duration-300"
            >
              <Search size={14} strokeWidth={1.5} />
            </motion.button>

            {/* Desktop: inline search input with portaled results dropdown */}
            <div className="hidden lg:block">
              <DesktopSearch />
            </div>

            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                className="w-11 h-11 md:w-10 md:h-10 border border-white/20 flex items-center justify-center hover:border-white/60 transition-colors duration-300 relative"
              >
                <Bell size={14} strokeWidth={1.5} />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white" />
              </motion.button>
              <AnimatePresence>
                {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
              </AnimatePresence>
            </div>

            <div className="relative">
              {!authReady ? (
                // Stable skeleton while auth is still resolving. Same pixel
                // footprint as both the profile avatar and the LOG IN button
                // so the layout doesn't jump when the real state arrives.
                <div
                  aria-hidden
                  className="w-11 h-11 md:w-10 md:h-10 border border-white/10 bg-white/[0.03]"
                />
              ) : isLoggedIn ? (
                <>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    aria-label="Profile menu"
                    aria-expanded={profileOpen}
                    className="w-11 h-11 md:w-10 md:h-10 border border-white flex items-center justify-center text-[10px] font-[var(--font-anton)] tracking-wider hover:bg-white hover:text-black transition-all duration-300"
                  >
                    {initials}
                  </motion.button>
                  <AnimatePresence>
                    {profileOpen && <ProfileDropdown onClose={() => setProfileOpen(false)} />}
                  </AnimatePresence>
                </>
              ) : (
                <Link
                  href="/login"
                  className="h-11 md:h-10 px-4 bg-white text-black flex items-center justify-center text-[10px] tracking-[0.12em] font-semibold hover:bg-transparent hover:text-white border border-white transition-all duration-300 whitespace-nowrap"
                >
                LOG IN
                </Link>
              )}
            </div>
          </div>
        </div>


      </nav>

      {/* Mobile bottom tab bar — 4 tabs, 56px tall */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-md border-t border-white/10 mobile-bottom-bar">
        <div className="flex items-center justify-around h-14 px-2">
          {mobileTabs.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.label}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 px-1.5 transition-all duration-200 ${
                  active ? "text-white" : "text-white/35"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[9px] tracking-[0.08em] uppercase">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
