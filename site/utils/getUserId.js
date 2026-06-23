// utils/getUserId.js
//
// Generates a stable per-browser anonymous id and persists it in
// localStorage, so credits/usage track a real (anonymous) user instead
// of every request hitting the same hardcoded "demo-user" id — which
// meant every visitor on the site secretly shared one credit balance.
//
// Once full account auth + Stripe checkout is wired up, swap this out
// for the real logged-in user id (e.g. from your auth session) and use
// this only as the logged-out fallback.

const STORAGE_KEY = "smokeshaq_user_id";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers without crypto.randomUUID
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getUserId() {
  if (typeof window === "undefined") {
    // Server-side render — no persistent id available yet.
    return null;
  }

  let id = window.localStorage.getItem(STORAGE_KEY);

  if (!id) {
    id = generateId();
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return id;
}
