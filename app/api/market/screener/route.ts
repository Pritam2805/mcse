import { NextResponse, type NextRequest } from "next/server";
import { convexServerClient } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sector = searchParams.get("sector") ?? undefined;
  const minPrice = Number(searchParams.get("min_price") ?? "0");
  const maxPrice = Number(searchParams.get("max_price") ?? "1000000");
  const minChange = Number(searchParams.get("min_change_pct") ?? "-100");
  const maxChange = Number(searchParams.get("max_change_pct") ?? "100");

  const convex = convexServerClient();
  const stocks = await convex.query(api.market.listStocks, {});

  const filtered = stocks
    .filter((s) => !sector || s.sector === sector)
    .filter((s) => s.currentPrice >= minPrice && s.currentPrice <= maxPrice)
    .filter((s) => s.changePctDay >= minChange && s.changePctDay <= maxChange);

  return NextResponse.json(
    filtered.map((s) => {
      const eps = s.sharesOutstanding > 0 ? s.profit / s.sharesOutstanding : 0;
      const pe = eps > 0 ? s.currentPrice / eps : null;
      return {
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        price: s.currentPrice,
        change_pct: s.changePctDay,
        volume: s.volumeDay,
        market_cap: s.marketCap,
        pe_ratio: pe,
      };
    }),
  );
}
