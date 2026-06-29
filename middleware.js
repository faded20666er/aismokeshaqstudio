// middleware.js
//
// Clerk's auth middleware — grants access to auth state throughout the
// app and lets us protect specific routes from unauthenticated users.
//
// NOTE: Clerk's docs name this file "proxy.ts" for Next.js 16+, but
// this project is on Next.js 14, where the correct filename is still
// "middleware.js" at the project root (same code either way).

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
