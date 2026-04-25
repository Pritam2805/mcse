import { NextResponse } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET() {
  const convex = convexServerClient();
  const state = await convex.query(api.market.getMarketState, {});
  if (!state) {
    return NextResponse.json({
      is_open: false,
      phase: "IDLE",
      day_number: 0,
      day_macro_ticks_elapsed: 0,
      ticks_per_day: 40,
      phase_ends_at: null,
    });
  }
  return NextResponse.json({
    is_open: state.isOpen,
    phase: state.isOpen ? "DAY_1" : "IDLE",
    day_number: state.dayNumber,
    day_macro_ticks_elapsed: state.currentMacroTick,
    ticks_per_day: 40,
    phase_ends_at: null,
  });
}
