// middleware/tierCheck.js
//
// Some models are genuinely premium-priced by the provider (e.g. Kling
// V2.0 Master on Atlas Cloud — real, verified-real-range per-second
// cost that works out to 60-119 credits for one clip, more than half
// a $10/200-credit Starter month). Gating those to specific
// subscription tiers means a Starter customer can't accidentally burn
// their whole month's credits on a single generation and bounce off
// the site — same instinct as the nsfw/locked gate, checking
// subscription tier instead of the NSFW toggle.
//
// model.minTier (see models/index.js) is one of the keys in
// config/subscriptionTiers.js ("starter" | "pro" | "premium"). No
// minTier field = no restriction, same as every model before this.

const TIER_RANK = {
  starter: 1,
  pro: 2,
  premium: 3,
};

// userTier comes from middleware/userSettingsStore.js's getUserSettings()
// — null/undefined when the user has no active subscription, which
// ranks below every paid tier (0), so an unsubscribed user never has
// access to a tier-gated model.
export function hasTierAccess(model, userTier) {
  if (!model.minTier) return true;
  const required = TIER_RANK[model.minTier] || 0;
  const have = TIER_RANK[userTier] || 0;
  return have >= required;
}

export function tierLabel(tierKey) {
  if (!tierKey) return tierKey;
  return tierKey.charAt(0).toUpperCase() + tierKey.slice(1);
}
