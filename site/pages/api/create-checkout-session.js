// pages/api/create-checkout-session.js
//
// Creates a Stripe Checkout session for a subscription tier. The
// frontend calls this, then redirects the browser to the returned URL.

import Stripe from "stripe";
import { getTierByKey } from "../../config/subscriptionTiers.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { tier, userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!tier) {
      return res.status(400).json({ error: "Missing tier" });
    }

    const tierConfig = getTierByKey(tier);

    if (!tierConfig || !tierConfig.priceId) {
      return res.status(400).json({ error: "Invalid or unconfigured tier" });
    }

    const origin =
      req.headers.origin || `https://${req.headers.host}` || "https://aismokeshaqstudio.shop";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: tierConfig.priceId,
          quantity: 1,
        },
      ],
      // userId is threaded through so the webhook knows whose credits
      // to top up when the subscription is created/renewed.
      client_reference_id: userId,
      metadata: {
        userId,
        tier,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
      success_url: `${origin}/studio?checkout=success`,
      cancel_url: `${origin}/studio?checkout=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session.js error:", err);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: err.message,
    });
  }
}
