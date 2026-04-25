import { ConvexHttpClient } from "convex/browser";

let cached: ConvexHttpClient | null = null;

export function convexServerClient(): ConvexHttpClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set.");
  }
  cached = new ConvexHttpClient(url);
  return cached;
}
