// utils/modelDropdown.js
//
// Formats models for the dropdown selector. Returns one flat,
// already-sorted list per category (most expensive / highest quality
// first, NSFW-locked models pushed to the end) — NOT grouped by
// provider, since that grouping was what made the old UI render as a
// long fragmented list instead of a real dropdown.

import { getSortedModels } from "../models/index.js";
import { hasTierAccess } from "../middleware/tierCheck.js";

const CATEGORIES = ["image", "video", "lipsync", "tts", "music"];

// userTier: the signed-in user's current subscription tier key
// ("starter" | "pro" | "premium" | null) — see
// middleware/userSettingsStore.js. Powers minTier-gated models (e.g.
// Kling V2.0 Master) the same way nsfwEnabled powers nsfw-gated ones.
export function getDropdownModels(nsfwEnabled = false, userTier = null) {
  const dropdown = {};

  CATEGORIES.forEach((category) => {
    const sorted = getSortedModels(category);

    // Spread the full model object so the UI can access all fields:
    // durations (video pills), creditsPerSecond + maxDurationSeconds
    // (lipsync slider), provider/domoAICategory (routing metadata), etc.
    // Only override `locked` — everything else passes through as-is.
    dropdown[category] = sorted.map((m) => ({
      ...m,
      imageInputs: m.imageInputs || { min: 0, max: 1 },
      locked:
        (m.nsfw && m.locked && !nsfwEnabled) ||
        (m.minTier && !hasTierAccess(m, userTier)),
    }));
  });

  return dropdown;
}
