// config/subscriptionTiers.js
//
// Single source of truth for subscription tiers — used by both the
// checkout-session API route and the webhook that grants credits.
// Price IDs come straight from the Stripe dashboard; keep this file in
// sync if tiers/prices ever change there.

export const SUBSCRIPTION_TIERS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER, // price_1Tksn3P8Ys6gPzq4P1lw7eL8 (recurring — the original price_1Sycc5... was a one-time price and has been replaced)
    monthlyPriceUsd: 10,
    creditsPerMonth: 200,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO, // price_1SycipP8Ys6gPzq4YQrIKiEl
    monthlyPriceUsd: 29,
    creditsPerMonth: 500,
  },
  premium: {
    name: "Premium",
    priceId: process.env.STRIPE_PRICE_PREMIUM, // price_1Tk8OpP8Ys6gPzq4aCZQALwt
    monthlyPriceUsd: 59,
    creditsPerMonth: 1000,
  },
};

export function getTierByPriceId(priceId) {
  return Object.values(SUBSCRIPTION_TIERS).find((tier) => tier.priceId === priceId) || null;
}

export function getTierByKey(key) {
  return SUBSCRIPTION_TIERS[key] || null;
}
