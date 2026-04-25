"use client";
import { useEffect, useState } from "react";

export interface LiveStock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  sector: string;
}

export function useLiveStocks(): { stocks: Map<string, LiveStock>; loading: boolean } {
  const [stocks, setStocks] = useState<Map<string, LiveStock>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchStocks() {
      try {
        const res = await fetch("/api/market/stocks");
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          ticker: string;
          name: string;
          price: number;
          change: number;
          change_pct: number;
          day_high: number;
          day_low: number;
          volume: number;
          market_cap: number;
          sector: string;
        }>;
        if (cancelled) return;
        const map = new Map<string, LiveStock>();
        for (const s of data) {
          map.set(s.ticker, {
            ticker: s.ticker,
            name: s.name,
            price: s.price,
            change: s.change,
            changePct: s.change_pct,
            dayHigh: s.day_high,
            dayLow: s.day_low,
            volume: s.volume,
            marketCap: s.market_cap,
            sector: s.sector,
          });
        }
        setStocks(map);
        setLoading(false);
      } catch {
        // ignore
      }
    }
    fetchStocks();
    const id = setInterval(fetchStocks, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { stocks, loading };
}
