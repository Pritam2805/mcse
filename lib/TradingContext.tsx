"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  ticker: string;
  name: string;
  type: "BUY" | "SELL";
  orderType: "DELIVERY" | "INTRADAY";
  pricingType: "MARKET" | "LIMIT";
  qty: number;
  price: number;
  limitPrice?: number;
  total: number;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  timestamp: number;
}

export interface Position {
  ticker: string;
  name: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface Transaction {
  id: string;
  type: "BUY" | "SELL";
  ticker?: string;
  name?: string;
  qty?: number;
  price?: number;
  amount: number;
  balance: number;
  timestamp: number;
  description: string;
}

interface TradingState {
  orders: Order[];
  positions: Position[];
  transactions: Transaction[];
  balance: number;
  watchlistTickers: Set<string>;
  placeOrder: (
    order: Omit<Order, "id" | "status" | "timestamp" | "total">,
  ) => Promise<{ success: boolean; message: string }>;
  getOrdersForTicker: (ticker: string) => Order[];
  getBuyCount: (ticker?: string) => number;
  getSellCount: (ticker?: string) => number;
  toggleWatchlist: (ticker: string) => Promise<void>;
  isWatched: (ticker: string) => boolean;
  refresh: () => Promise<void>;
}

const TradingContext = createContext<TradingState>({
  orders: [],
  positions: [],
  transactions: [],
  balance: 0,
  watchlistTickers: new Set(),
  placeOrder: async () => ({ success: false, message: "Not ready" }),
  getOrdersForTicker: () => [],
  getBuyCount: () => 0,
  getSellCount: () => 0,
  toggleWatchlist: async () => {},
  isWatched: () => false,
  refresh: async () => {},
});

// ── Auth helper: read the preview session token from localStorage ────────────
const STORAGE_KEY = "mcse_preview_session";
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// ── Provider ─────────────────────────────────────────────────────────────────

export function TradingProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [watchlistTickers, setWatchlistTickers] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const token = getAuthToken();
    if (!token || !API_BASE) return;

    try {
      const [ordersRes, portfolioRes, watchlistRes] = await Promise.all([
        fetch(`${API_BASE}/investor/orders`, { headers: authHeaders() }),
        fetch(`${API_BASE}/investor/portfolio`, { headers: authHeaders() }),
        fetch(`${API_BASE}/investor/watchlist`, { headers: authHeaders() }),
      ]);

      if (ordersRes.ok) {
        const raw = (await ordersRes.json()) as Array<Record<string, unknown>>;
        const loadedOrders: Order[] = raw.map((o) => ({
          id: String(o.id),
          ticker: String(o.ticker),
          name: String(o.name ?? o.ticker),
          type: (o.type as "BUY" | "SELL") ?? "BUY",
          orderType: (o.order_type as "DELIVERY" | "INTRADAY") ?? "DELIVERY",
          pricingType: (o.pricing_type as "MARKET" | "LIMIT") ?? "MARKET",
          qty: Number(o.qty ?? 0),
          price: Number(o.price ?? 0),
          total: Number(o.total ?? 0),
          status: (o.status as Order["status"]) ?? "COMPLETED",
          timestamp: Number(o.timestamp ?? Date.now()),
        }));
        setOrders(loadedOrders);

        const derived: Transaction[] = [];
        let runBal = 0;
        const chronological = [...loadedOrders].sort((a, b) => a.timestamp - b.timestamp);
        for (const o of chronological) {
          const amount = o.type === "BUY" ? -o.total : o.total;
          runBal += amount;
          derived.push({
            id: `TXN-${o.id}`,
            type: o.type,
            ticker: o.ticker,
            name: o.name,
            qty: o.qty,
            price: o.price,
            amount,
            balance: runBal,
            timestamp: o.timestamp,
            description: `${o.type === "BUY" ? "Bought" : "Sold"} ${o.qty} ${o.ticker} @ \u20B9${o.price.toFixed(2)}`,
          });
        }
        setTransactions(derived.reverse());
      }

      if (portfolioRes.ok) {
        const pf = (await portfolioRes.json()) as {
          balance: number;
          holdings: Array<{
            ticker: string;
            name: string;
            quantity: number;
            avg_price: number;
            current_price: number | null;
            pnl: number | null;
          }>;
        };
        setBalance(pf.balance);
        setPositions(
          pf.holdings.map((h) => {
            const currentPrice = h.current_price ?? h.avg_price;
            const pnl = h.pnl ?? (currentPrice - h.avg_price) * h.quantity;
            const pnlPercent = h.avg_price > 0 ? ((currentPrice - h.avg_price) / h.avg_price) * 100 : 0;
            return {
              ticker: h.ticker,
              name: h.name,
              qty: h.quantity,
              avgPrice: h.avg_price,
              currentPrice,
              pnl,
              pnlPercent,
            };
          }),
        );
      }

      if (watchlistRes.ok) {
        const wl = (await watchlistRes.json()) as Array<{ ticker: string }>;
        setWatchlistTickers(new Set(wl.map((w) => w.ticker)));
      }
    } catch (err) {
      console.error("Trading refresh failed:", err);
    }
  }, []);

  // Initial load + poll every 15s
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const placeOrder = useCallback(
    async (
      input: Omit<Order, "id" | "status" | "timestamp" | "total">,
    ): Promise<{ success: boolean; message: string }> => {
      if (!API_BASE) return { success: false, message: "API not configured" };
      try {
        const res = await fetch(`${API_BASE}/investor/orders`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            ticker: input.ticker,
            side: input.type,
            order_type: input.orderType,
            pricing_type: input.pricingType,
            qty: input.qty,
            limit_price: input.limitPrice,
          }),
        });
        const body = (await res.json()) as { success: boolean; message: string };
        if (body.success) await refresh();
        return body;
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "Order failed",
        };
      }
    },
    [refresh],
  );

  const getOrdersForTicker = useCallback(
    (ticker: string) => orders.filter((o) => o.ticker === ticker),
    [orders],
  );
  const getBuyCount = useCallback(
    (ticker?: string) =>
      orders.filter((o) => o.type === "BUY" && (!ticker || o.ticker === ticker)).length,
    [orders],
  );
  const getSellCount = useCallback(
    (ticker?: string) =>
      orders.filter((o) => o.type === "SELL" && (!ticker || o.ticker === ticker)).length,
    [orders],
  );

  const toggleWatchlist = useCallback(
    async (ticker: string) => {
      if (!API_BASE) return;
      const isCurrentlyWatched = watchlistTickers.has(ticker);
      try {
        if (isCurrentlyWatched) {
          await fetch(`${API_BASE}/investor/watchlist/${ticker}`, {
            method: "DELETE",
            headers: authHeaders(),
          });
        } else {
          await fetch(`${API_BASE}/investor/watchlist`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ ticker }),
          });
        }
        await refresh();
      } catch (err) {
        console.error("Watchlist toggle failed:", err);
      }
    },
    [watchlistTickers, refresh],
  );

  const isWatched = useCallback(
    (ticker: string) => watchlistTickers.has(ticker),
    [watchlistTickers],
  );

  const value = useMemo(
    () => ({
      orders,
      positions,
      transactions,
      balance,
      watchlistTickers,
      placeOrder,
      getOrdersForTicker,
      getBuyCount,
      getSellCount,
      toggleWatchlist,
      isWatched,
      refresh,
    }),
    [
      orders,
      positions,
      transactions,
      balance,
      watchlistTickers,
      placeOrder,
      getOrdersForTicker,
      getBuyCount,
      getSellCount,
      toggleWatchlist,
      isWatched,
      refresh,
    ],
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading() {
  return useContext(TradingContext);
}
