import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Any non-Clerk auth mode (preview, aeon, ...) bypasses Clerk middleware.
// Otherwise Clerk throws "Missing publishableKey" because no key is configured.
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE;
const USE_CLERK = !AUTH_MODE;

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/portfolio(.*)",
  "/holdings(.*)",
  "/positions(.*)",
  "/orders(.*)",
  "/watchlist(.*)",
  "/analyse(.*)",
]);

const clerkMw = clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth.protect();
});

function passthroughMw(_req: NextRequest) {
  return NextResponse.next();
}

export default USE_CLERK ? clerkMw : passthroughMw;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
    "/(api|trpc)(.*)",
  ],
};
