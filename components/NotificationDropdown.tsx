"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, TrendingDown, Info, Activity, CheckCheck, ArrowLeft, Bell, ShoppingCart, Calendar } from "lucide-react";
import Portal from "@/components/Portal";
import { getNotifications, markNotificationRead, markAllNotificationsRead, Notification as ApiNotification } from "@/lib/api";

type NotifCategory = "PRICE ALERT" | "VOLUME" | "INFO" | "ORDER" | "EVENT" | "MARKET" | "SYSTEM";

interface DisplayNotification {
  id: string;
  type: "gain" | "loss" | "info" | "order" | "event";
  category: NotifCategory;
  ticker: string;
  text: string;
  time: string;
  group: "TODAY" | "EARLIER";
  read: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

function mapApiToDisplay(n: ApiNotification): DisplayNotification {
  const time = formatTimeAgo(n.createdAt);
  const diffMs = new Date().getTime() - new Date(n.createdAt).getTime();
  const isToday = diffMs < 86400000;
  
  let type: DisplayNotification["type"] = "info";
  let category: NotifCategory = "INFO";
  
  if (n.kind === "ORDER_FILLED" || n.kind === "ORDER_PARTIAL" || n.kind === "ORDER_CANCELLED") {
    type = "order";
    category = "ORDER";
  } else if (n.kind === "PRICE_ALERT") {
    type = n.body.toLowerCase().includes("up") || n.body.toLowerCase().includes("crossed") ? "gain" : "loss";
    category = "PRICE ALERT";
  } else if (n.kind === "CORPORATE_EVENT" || n.kind === "NEWS_ALERT") {
    type = "event";
    category = "EVENT";
  } else if (n.kind === "MARKET_EVENT" || n.kind === "DAY_START" || n.kind === "DAY_END" || n.kind === "CIRCUIT_BREAKER") {
    type = "info";
    category = "MARKET";
  } else {
    type = "info";
    category = "SYSTEM";
  }
  
  return {
    id: n.notificationId,
    type,
    category,
    ticker: n.relatedTicker || "",
    text: n.body,
    time,
    group: isToday ? "TODAY" : "EARLIER",
    read: n.isRead,
  };
}

export default function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getNotifications().then(res => {
      if (cancelled) return;
      if (res.data) setNotifications(res.data.map(mapApiToDisplay));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const todayNotifs = notifications.filter((n) => n.group === "TODAY");
  const earlierNotifs = notifications.filter((n) => n.group === "EARLIER");

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead();
  };

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await markNotificationRead(id);
  };

  const iconFor = (type: string) => {
    if (type === "gain") return <TrendingUp size={13} className="text-up" />;
    if (type === "loss") return <TrendingDown size={13} className="text-down" />;
    if (type === "order") return <ShoppingCart size={13} className="text-blue-400" />;
    if (type === "event") return <Calendar size={13} className="text-amber-400" />;
    return <Info size={13} className="text-white/30" />;
  };

  const renderNotification = (n: DisplayNotification, i: number) => {
    const handleClick = () => {
      if (!n.read) markRead(n.id);
    };
    const inner = (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02 * i, duration: 0.15 }}
        className={`flex items-start gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors duration-300 ${!n.read ? "bg-white/[0.02]" : ""}`}
      >
        <div className="mt-0.5 shrink-0 w-5 flex justify-center">{iconFor(n.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {n.ticker && (
              <span className="font-[var(--font-anton)] text-[11px] tracking-[0.05em]">{n.ticker}</span>
            )}
            <span className="flex items-center text-[7px] tracking-[0.12em] text-white/25 font-medium">
              {n.category === "VOLUME" && <Activity size={7} className="mr-0.5" />}
              {n.category}
            </span>
          </div>
          <p className={`text-[11px] leading-relaxed ${n.read ? "text-white/30" : "text-white/60"}`}>{n.text}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
          <span className="text-[9px] text-white/20">{n.time}</span>
          {!n.read && <span className="w-1.5 h-1.5 bg-white/50" />}
        </div>
      </motion.div>
    );

    return n.ticker ? (
      <Link key={n.id} href={`/stock/${n.ticker}`} onClick={() => { handleClick(); onClose(); }}>
        {inner}
      </Link>
    ) : (
      <div key={n.id} onClick={handleClick}>{inner}</div>
    );
  };

  const sectionHeader = (label: string) => (
    <div className="sticky top-0 bg-bg/95 backdrop-blur-sm px-5 py-2 border-b border-white/6">
      <span className="text-[8px] tracking-[0.2em] text-white/15">{label}</span>
    </div>
  );

  const listContent = (
    <>
      {loading ? (
        <div className="p-8 text-center">
          <Bell size={20} className="mx-auto text-white/10 mb-3 animate-pulse" />
          <p className="text-[10px] tracking-[0.1em] text-white/20">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center">
          <Bell size={20} className="mx-auto text-white/10 mb-3" />
          <p className="text-[10px] tracking-[0.1em] text-white/20">No notifications</p>
        </div>
      ) : (
        <>
          {todayNotifs.length > 0 && (
            <>
              {sectionHeader("TODAY")}
              <div className="divide-y divide-white/6">
                {todayNotifs.map((n, i) => renderNotification(n, i))}
              </div>
            </>
          )}
          {earlierNotifs.length > 0 && (
            <>
              {sectionHeader("EARLIER")}
              <div className="divide-y divide-white/6">
                {earlierNotifs.map((n, i) => renderNotification(n, i + todayNotifs.length))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );

  const mobileModal = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="md:hidden fixed inset-0 bg-bg z-[60] flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="w-11 h-11 flex items-center justify-center -ml-2">
          <ArrowLeft size={20} className="text-white/60" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-[11px] tracking-[0.2em] text-white/50">ALERTS</span>
          {unreadCount > 0 && (
            <span className="text-[9px] tracking-[0.08em] bg-white/10 text-white/60 font-medium px-2 py-0.5">
              {unreadCount} NEW
            </span>
          )}
        </div>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] text-white/30 min-h-[44px] px-3"
        >
          <CheckCheck size={10} />
          MARK READ
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">{listContent}</div>
    </motion.div>
  );

  return (
    <>
      <Portal>{mobileModal}</Portal>

      {/* Desktop: Anchored dropdown */}
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="hidden md:flex absolute right-0 top-10 w-[min(380px,calc(100vw-2rem))] bg-bg border border-white/15 z-50 max-h-[min(28rem,calc(100dvh-8rem))] flex-col"
      >
        <div className="px-5 py-3.5 border-b border-white/10 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-[0.2em] text-white/40">ALERTS</span>
            {unreadCount > 0 && (
              <span className="text-[9px] tracking-[0.08em] bg-white/10 text-white/60 font-medium px-2 py-0.5">
                {unreadCount} NEW
              </span>
            )}
          </div>
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] text-white/20 hover:text-white/50 transition-colors duration-300"
          >
            <CheckCheck size={10} />
            MARK READ
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">{listContent}</div>
      </motion.div>
    </>
  );
}
