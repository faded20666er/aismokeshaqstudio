// utils/modelDropdown.js
//
// Formats models for the dropdown selector. Returns one flat,
// already-sorted list per category (most expensive / highest quality
// first, NSFW-locked models pushed to the end) — NOT grouped by
// provider, since that grouping was what made the old UI render as a
// long fragmented list instead of a real dropdown.

import { getSortedModels } from "../models/index.js";

const CATEGORIES = ["image", "video", "lipsync", "tts"];

export function getDropdownModels(nsfwEnabled = false) {
  const dropdown = {};

  CATEGORIES.forEach((category) => {
    const sorted = getSortedModels(category);

    dropdown[category] = sorted.map((m) => ({
      id: m.id,
      name: m.name,
      credits: m.credits,
      description: m.description,
      nsfw: m.nsfw,
      premium: m.premium,
      locked: m.nsfw && m.locked && !nsfwEnabled,
    }));
  });

  return dropdown;
}
