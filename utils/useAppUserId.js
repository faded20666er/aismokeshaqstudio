// utils/useAppUserId.js
//
// Returns the real, stable user ID to use for credits/generations:
//   - Signed in (via Clerk)  -> Clerk's real user.id (tracks the actual
//     account across devices/browsers, survives clearing localStorage)
//   - Signed out             -> a per-browser anonymous id (so logged-
//     out visitors still get a usable, if limited, free experience)
//
// This replaces the old utils/getUserId.js plain-function version,
// which only ever returned an anonymous id with no real account tie.

import { useUser } from "@clerk/nextjs";

const STORAGE_KEY = "smokeshaq_anon_user_id";

function generateAnonId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getAnonUserId() {
  if (typeof window === "undefined") return null;

  let id = window.localStorage.getItem(STORAGE_KEY);

  if (!id) {
    id = generateAnonId();
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return id;
}

// Use this hook inside React components.
export function useAppUserId() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    // Clerk hasn't finished loading auth state yet — caller should
    // treat this as "not ready" and avoid firing requests too early.
    return { userId: null, isReady: false, isSignedIn: false };
  }

  if (isSignedIn && user) {
    return { userId: user.id, isReady: true, isSignedIn: true };
  }

  return { userId: getAnonUserId(), isReady: true, isSignedIn: false };
}
