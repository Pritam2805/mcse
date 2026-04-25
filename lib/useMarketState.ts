"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface MarketState {
  isOpen: boolean;
  currentMicroTick: number;
  currentMacroTick: number;
  dayNumber: number;
  openedAt: number | null;
  closedAt: number | null;
  /** True only after the first reactive snapshot has arrived. */
  ready: boolean;
}

/**
 * Reactive market state hook. Subscribes to Convex via WebSocket so any
 * admin open/close action is reflected app-wide within ~100ms — no polling.
 *
 * `ready` lets the UI distinguish "still loading" from "actually closed":
 * we don't want to flash a CLOSED banner on every page mount before the
 * first snapshot arrives.
 */
export function useMarketState(): MarketState {
  const raw = useQuery(api.market.getMarketState, {});

  if (raw === undefined) {
    return {
      isOpen: false,
      currentMicroTick: 0,
      currentMacroTick: 0,
      dayNumber: 0,
      openedAt: null,
      closedAt: null,
      ready: false,
    };
  }
  if (raw === null) {
    return {
      isOpen: false,
      currentMicroTick: 0,
      currentMacroTick: 0,
      dayNumber: 0,
      openedAt: null,
      closedAt: null,
      ready: true,
    };
  }
  return {
    isOpen: raw.isOpen,
    currentMicroTick: raw.currentMicroTick,
    currentMacroTick: raw.currentMacroTick,
    dayNumber: raw.dayNumber,
    openedAt: raw.openedAt,
    closedAt: null,
    ready: true,
  };
}
