// middleware/verifyUserId.js
//
// SECURITY FIX [Sep 4 2026]: every API route on this site used to trust
// whatever `userId` the browser sent in the request body/query, with
// nothing checking it was actually true. Since a REAL account's id
// (Clerk's user.id, always prefixed "user_" — see
// utils/useAppUserId.js) is what credits, history, saved characters,
// BYOK keys, and NSFW settings are all keyed by, anyone who ever
// learned another customer's account id (a leaked link, a shared
// screen, a future bug) could read that person's private generation
// history or drain/inflate their credit balance with a plain HTTP
// request — no password needed. A real, outside security review
// (Sep 4 2026) flagged exactly this: classic IDOR / broken
// object-level authorization.
//
// FIX: verify the claimed userId against Clerk's own session on every
// request that touches a REAL account. Anonymous/guest ids (prefixed
// "anon-" — see utils/useAppUserId.js) are deliberately left alone:
// they're never tied to a real login or real money
// (GUEST_STARTING_CREDITS is always 0, see
// middleware/creditsStore.js), so there's no real identity to verify
// and nothing of value to protect there — this preserves the
// intentional "usable without an account" guest experience instead of
// force-requiring sign-in on every route.
//
// This works because middleware.js already runs clerkMiddleware()
// across every request including /api/* (see its `matcher` config),
// which is what makes getAuth(req) able to read the real session here
// — no extra setup needed per-route beyond calling this.

import { getAuth } from "@clerk/nextjs/server";

function isRealAccountId(userId) {
  return typeof userId === "string" && userId.startsWith("user_");
}

// Call this right after confirming `userId` is present on the request.
// Returns { ok: true, userId } if the request may proceed with that id
// (either it's a verified real account, or it's an anonymous/guest id
// with nothing to verify), or { ok: false, status, error } if the
// caller should be rejected — e.g.:
//
//   const auth = verifyUserId(req, userId);
//   if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
export function verifyUserId(req, claimedUserId) {
  if (!isRealAccountId(claimedUserId)) {
    return { ok: true, userId: claimedUserId };
  }

  const { userId: sessionUserId } = getAuth(req);

  if (!sessionUserId || sessionUserId !== claimedUserId) {
    return {
      ok: false,
      status: 401,
      error: "Not authenticated as this account",
    };
  }

  return { ok: true, userId: sessionUserId };
}
