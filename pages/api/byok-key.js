// pages/api/byok-key.js
//
// Lets Pro/Premium subscribers save their own ElevenLabs API key, so
// they get access to ElevenLabs' full voice catalog and any custom/
// cloned voices they've made over there — at zero generation cost to
// us, since they're billing ElevenLabs directly on their own key.
//
// GET  -> { hasKey: boolean }  (never returns the actual key value)
// POST -> save a new key (requires Pro or Premium tier)
// DELETE -> remove the saved key

import { getUserSettings } from "../../middleware/userSettingsStore.js";
import { saveByokKey, deleteByokKey, hasByokKey } from "../../middleware/byokStore.js";

const ALLOWED_TIERS = ["pro", "premium"];

export default async function handler(req, res) {
  try {
    const { userId } = req.method === "GET" ? req.query : req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (req.method === "GET") {
      const hasKey = await hasByokKey(userId, "elevenlabs");
      return res.status(200).json({ hasKey });
    }

    // POST and DELETE both require an active Pro/Premium subscription —
    // this is the actual perk gate.
    const settings = await getUserSettings(userId);
    if (!ALLOWED_TIERS.includes(settings.tier)) {
      return res.status(403).json({
        error: "Bring-your-own-key voices are a Pro/Premium subscriber perk. Upgrade your plan to unlock this.",
      });
    }

    if (req.method === "POST") {
      const { apiKey } = req.body || {};

      if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
        return res.status(400).json({ error: "Missing or invalid apiKey" });
      }

      await saveByokKey(userId, "elevenlabs", apiKey);
      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      await deleteByokKey(userId, "elevenlabs");
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("byok-key.js error:", err);
    return res.status(500).json({ error: "Failed to manage BYOK key", details: err.message });
  }
}
