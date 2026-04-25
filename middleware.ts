import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const IS_PREVIEW = process.env.NEXT_PUBLIC_AUTH_MODE === "preview";
const IS_AEON = process.env.NEXT_PUBLIC_AUTH_MODE === "aeon";
// Clerk is only used in the default mode. Aeon and Preview both gate on the
// client (AuthContext + the login page) since the session token lives in
// localStorage, not in a cookie that the edge middleware can read.
const SKIP_CLERK = IS_PREVIEW || IS_AEON;

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

export default SKIP_CLERK ? passthroughMw : clerkMw;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
    "/(api|trpc)(.*)",
  ],
};
