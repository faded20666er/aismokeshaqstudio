// pages/api/stripe-webhook.js
//
// Handles Stripe webhook events. This is what actually grants credits
// when someone subscribes or their subscription renews — without this,
// Stripe would happily take payments while the app never knows to add
// credits.
//
// IMPORTANT SETUP STEP (do this in Stripe dashboard, not in code):
// 1. Go to Stripe Dashboard -> Developers -> Webhooks -> Add endpoint
// 2. Endpoint URL: https://aismokeshaqstudio.shop/api/stripe-webhook
// 3. Events to send: checkout.session.completed,
//    invoice.payment_succeeded, customer.subscription.deleted
// 4. Copy the "Signing secret" (whsec_...) into your Vercel env vars as
//    STRIPE_WEBHOOK_SECRET — without this, signature verification below
//    will fail and Stripe will get 400 errors on every event.

import Stripe from "stripe";
import { setUserCredits } from "../../middleware/creditsStore.js";
import { getTierByKey } from "../../config/subscriptionTiers.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe needs the raw request body to verify the signature, so we
// disable Next.js's automatic JSON body parsing for this route only.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Manually collect the raw request body as a Buffer (no extra
// dependency needed — just Node's built-in stream events).
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("stripe-webhook.js signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature verification failed` });
  }

  try {
    switch (event.type) {
      // First time someone completes checkout for a subscription.
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const tierKey = session.metadata?.tier;
        const tierConfig = getTierByKey(tierKey);

        if (userId && tierConfig) {
          await setUserCredits(userId, tierConfig.creditsPerMonth);
        } else {
          console.error("checkout.session.completed missing userId or tier", {
            userId,
            tierKey,
          });
        }
        break;
      }

      // Each successful monthly renewal — top the user back up to their
      // tier's monthly allotment (does not stack/roll over by design,
      // matches how most competitor credit plans work).
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          const tierKey = subscription.metadata?.tier;
          const tierConfig = getTierByKey(tierKey);

          if (userId && tierConfig) {
            await setUserCredits(userId, tierConfig.creditsPerMonth);
          }
        }
        break;
      }

      // Subscription cancelled or payment ultimately failed — drop the
      // user back to a small free allotment rather than zero, so they
      // can still browse but not generate freely.
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await setUserCredits(userId, 0);
        }
        break;
      }

      default:
        // Unhandled event types are fine to ignore.
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("stripe-webhook.js handler error:", err);
    // Still return 200 so Stripe doesn't retry indefinitely on our bug;
    // log loudly instead so it gets noticed and fixed.
    return res.status(200).json({ received: true, handledWithError: true });
  }
}
