// pages/api/nsfw-toggle.js
//
// Saves the user's NSFW-unlock preference. Moved here from the dead
// /api folder.

import { updateUserSettings } from "../../middleware/userSettingsStore.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId, enabled } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "Missing or invalid enabled flag" });
    }

    await updateUserSettings(userId, { nsfwEnabled: enabled });

    return res.status(200).json({
      success: true,
      nsfwEnabled: enabled,
    });
  } catch (err) {
    console.error("nsfw-toggle.js error:", err);
    return res.status(500).json({
      error: "Failed to update NSFW setting",
      details: err.message,
    });
  }
}
