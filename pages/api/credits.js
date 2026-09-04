// pages/api/credits.js
//
// Lets the frontend check/add/set a user's credit balance. Now backed
// by the consolidated Redis store (see middleware/creditsStore.js) so
// balances persist instead of resetting on every serverless cold start.

import { getUserCredits, addCredits, setUserCredits, isOwnerUser } from "../../middleware/creditsStore.js";
import { getUserSettings } from "../../middleware/userSettingsStore.js";
import { verifyUserId } from "../../middleware/verifyUserId.js";

export default async function handler(req, res) {
  try {
    const { method } = req;

    if (method === "GET") {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const auth = verifyUserId(req, userId);
      if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
      }

      const credits = await getUserCredits(userId);
      // Also surfaced here (not just from Stripe webhook state) so the
      // frontend can gate tier-restricted models (e.g. Kling V2.0
      // Master, see middleware/tierCheck.js) without a second round trip.
      const { tier } = await getUserSettings(userId);

      return res.status(200).json({
        success: true,
        userId,
        credits,
        tier,
      });
    }

    if (method === "POST") {
      const { userId, amount, set } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const auth = verifyUserId(req, userId);
      if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
      }

      // SECURITY FIX [Sep 4 2026]: nothing in the actual app calls this
      // POST — the frontend only ever GETs a balance (see pages/_app.jsx
      // and pages/studio.jsx). Real credit changes happen server-to-
      // server via pages/api/stripe-webhook.js (subscription events) and
      // utils/runModelAsync.js (deducting after a generation), neither
      // of which goes through this HTTP endpoint. Left wide open, ANY
      // signed-in customer could have called this on themselves —
      // `{ userId: <their own real id>, set: 999999 }` — and handed
      // themselves free credits with zero payment, even after the
      // identity check above (verifyUserId only confirms you are who
      // you say you are, it doesn't decide what you're allowed to set).
      // Restricted to owner/testing accounts only, matching the one
      // real remaining use case: manually setting a balance while
      // testing (see middleware/creditsStore.js's OWNER_USER_IDS).
      if (!isOwnerUser(userId)) {
        return res.status(403).json({
          error: "Direct credit changes aren't available through this endpoint.",
        });
      }

      let updated;

      if (typeof set === "number") {
        updated = await setUserCredits(userId, set);
      } else if (typeof amount === "number") {
        updated = await addCredits(userId, amount);
      } else {
        return res.status(400).json({ error: "Missing amount or set value" });
      }

      return res.status(200).json({
        success: true,
        userId,
        credits: updated,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("credits.js error:", err);
    return res.status(500).json({
      error: "Failed to process credit request",
      details: err.message,
    });
  }
}
