"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

export interface WSMessage {
  type: string;
  payload: unknown;
  timestamp: string;
}

export interface MarketTickData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bid: number;
  ask: number;
  book?: { bids: [number, number][]; asks: [number, number][] };
}

export interface DayTickUpdate {
  dayNumber: number;
  dayTickCounter: number;
  ticksPerDay: number;
  marketOpen: boolean;
}

export interface NotificationPush {
  notificationId: string;
  kind: string;
  title: string;
  body: string;
  relatedTicker: string | null;
}

interface WebSocketState {
  status: WebSocketStatus;
  lastMessage: WSMessage | null;
  marketTicks: Record<string, MarketTickData>;
  dayTick: DayTickUpdate | null;
  notifications: NotificationPush[];
  unreadCount: number;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  send: (message: object) => void;
  clearNotification: (id: string) => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const WebSocketContext = createContext<WebSocketState>({
  status: "disconnected",
  lastMessage: null,
  marketTicks: {},
  dayTick: null,
  notifications: [],
  unreadCount: 0,
  subscribe: () => {},
  unsubscribe: () => {},
  send: () => {},
  clearNotification: () => {},
});

// ─── Mock WebSocket for Development ────────────────────────────────────────────

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "";
const USE_MOCK = !WS_BASE_URL;

// Mock price ticks - simulates real-time price updates
function createMockTicker(initialPrice: number): () => MarketTickData {
  let price = initialPrice;
  let volume = Math.floor(Math.random() * 10000);

  return () => {
    const change = (Math.random() - 0.5) * initialPrice * 0.002;
    price = Math.max(price + change, 1);
    volume += Math.floor(Math.random() * 100);

    const spread = price * 0.001;
    return {
      ticker: "",
      price: +price.toFixed(2),
      change: +change.toFixed(2),
      changePercent: +((change / (price - change)) * 100).toFixed(2),
      volume,
      bid: +(price - spread).toFixed(2),
      ask: +(price + spread).toFixed(2),
    };
  };
}

const mockTickers: Record<string, () => MarketTickData> = {
  MACAD: createMockTicker(1198.5),
  ECLOUD: createMockTicker(3215.4),
  ENAI: createMockTicker(4850.0),
  ESOFT: createMockTicker(1842.5),
  CELBIO: createMockTicker(2148.0),
  GMAUTO: createMockTicker(1456.2),
};

// ─── Provider ──────────────────────────────────────────────────────────────────

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [marketTicks, setMarketTicks] = useState<Record<string, MarketTickData>>({});
  const [dayTick, setDayTick] = useState<DayTickUpdate | null>({
    dayNumber: 1,
    dayTickCounter: 5,
    ticksPerDay: 18,
    marketOpen: true,
  });
  const [notifications, setNotifications] = useState<NotificationPush[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const connectRef = useRef<() => Promise<void>>(undefined);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (USE_MOCK) {
      // Mock mode - simulate WebSocket with intervals
      setStatus("connected");

      // Simulate market ticks every 5 seconds
      mockIntervalRef.current = setInterval(() => {
        const newTicks: Record<string, MarketTickData> = {};
        for (const [ticker, tickFn] of Object.entries(mockTickers)) {
          if (subscriptionsRef.current.has(`market:${ticker}`) || subscriptionsRef.current.has("market:all")) {
            newTicks[ticker] = { ...tickFn(), ticker };
          }
        }
        if (Object.keys(newTicks).length > 0) {
          setMarketTicks((prev) => ({ ...prev, ...newTicks }));
        }

        // Simulate day tick update
        if (subscriptionsRef.current.has("admin:day")) {
          setDayTick((prev) => {
            if (!prev) return prev;
            const newCounter = (prev.dayTickCounter + 1) % prev.ticksPerDay;
            const newDay = newCounter === 0 ? prev.dayNumber + 1 : prev.dayNumber;
            return {
              ...prev,
              dayTickCounter: newCounter,
              dayNumber: newDay,
            };
          });
        }
      }, 5000);

      return;
    }

    // Real WebSocket connection
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    // /stream/market is public; do not attach authentication tokens to the URL
    const ws = new WebSocket(`${WS_BASE_URL}/stream/market`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      // Re-subscribe to channels after reconnect
      subscriptionsRef.current.forEach((channel) => {
        ws.send(JSON.stringify({ type: "subscribe", channel }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as Record<string, unknown> & { type: string };
        setLastMessage({ type: message.type, payload: message, timestamp: new Date().toISOString() });

        // Route message to appropriate state
        switch (message.type) {
          case "PRICES_UPDATE": {
            const prices = (message.prices as { ticker: string; price: number }[]) ?? [];
            const orderbooks = (message.orderbooks as { ticker: string; book: { bids: [number, number][]; asks: [number, number][] } }[]) ?? [];
            const orderbooksByTicker = new Map(orderbooks.map((ob) => [ob.ticker, ob]));
            const newTicks: Record<string, MarketTickData> = {};
            for (const p of prices) {
              const book = orderbooksByTicker.get(p.ticker)?.book;
              newTicks[p.ticker] = {
                ticker: p.ticker,
                price: p.price,
                change: 0,
                changePercent: 0,
                volume: 0,
                bid: book?.bids?.[0]?.[0] ?? p.price,
                ask: book?.asks?.[0]?.[0] ?? p.price,
                book,
              };
            }
            setMarketTicks((prev) => ({ ...prev, ...newTicks }));
            break;
          }

          case "market:tick": {
            const tickData = message as unknown as MarketTickData;
            setMarketTicks((prev) => ({ ...prev, [tickData.ticker]: tickData }));
            break;
          }

          case "admin:day":
            setDayTick(message as unknown as DayTickUpdate);
            break;

          case "notification": {
            const notif = message as unknown as NotificationPush;
            setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
            setUnreadCount((prev) => prev + 1);
            break;
          }

          case "ETF_NAV_UPDATE": {
            const updates = (message.etf_navs as { ticker: string; nav: number; market_price: number }[]) ?? [];
            const newTicks: Record<string, MarketTickData> = {};
            for (const e of updates) {
              newTicks[e.ticker] = {
                ticker:        e.ticker,
                price:         e.market_price,
                change:        0,
                changePercent: 0,
                volume:        0,
                bid:           e.nav,
                ask:           e.market_price,
              };
            }
            setMarketTicks((prev) => ({ ...prev, ...newTicks }));
            break;
          }

          default:
            // Unknown message type - log in dev
            if (process.env.NODE_ENV === "development") {
              console.log("[WS] Unknown message type:", message.type);
            }
        }
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;

      // Attempt reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => connectRef.current?.(), 5000);
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  // Subscribe to a channel
  const subscribe = useCallback((channel: string) => {
    subscriptionsRef.current.add(channel);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", channel }));
    }
  }, []);

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channel: string) => {
    subscriptionsRef.current.delete(channel);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", channel }));
    }
  }, []);

  // Send a message
  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Clear a notification
  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    // Defer to avoid synchronous setState in effect body
    const id = requestAnimationFrame(() => connect());
    return () => {
      cancelAnimationFrame(id);
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <WebSocketContext.Provider
      value={{
        status,
        lastMessage,
        marketTicks,
        dayTick,
        notifications,
        unreadCount,
        subscribe,
        unsubscribe,
        send,
        clearNotification,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useWebSocket() {
  return useContext(WebSocketContext);
}

// Convenience hook for subscribing to market data
export function useMarketTick(ticker: string): MarketTickData | null {
  const { marketTicks, subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    subscribe(`market:${ticker}`);
    return () => unsubscribe(`market:${ticker}`);
  }, [ticker, subscribe, unsubscribe]);

  return marketTicks[ticker] || null;
}

// Convenience hook for day/tick counter
export function useDayTick(): DayTickUpdate | null {
  const { dayTick, subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    subscribe("admin:day");
    return () => unsubscribe("admin:day");
  }, [subscribe, unsubscribe]);

  return dayTick;
}

// Convenience hook for notifications
export function useNotifications() {
  const { notifications, unreadCount, clearNotification, subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    subscribe("user:notifications");
    return () => unsubscribe("user:notifications");
  }, [subscribe, unsubscribe]);

  return { notifications, unreadCount, clearNotification };
}
