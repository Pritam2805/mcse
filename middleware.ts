import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const IS_PREVIEW = process.env.NEXT_PUBLIC_AUTH_MODE === "preview";

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

function previewMw(_req: NextRequest) {
  return NextResponse.next();
}

export default IS_PREVIEW ? previewMw : clerkMw;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
    "/(api|trpc)(.*)",
  ],
};
