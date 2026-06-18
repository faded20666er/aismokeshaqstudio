// AISmokeShaqStudio/utils/modelDropdown.js

import { MODELS } from "../models/index.js";

// -------------------------------------------------------------
// Group models by provider family for clean dropdown sections
// -------------------------------------------------------------
function groupByProvider(models) {
  const groups = {};

  models.forEach((m) => {
    // Extract provider label from name: "FLUX-2 Pro (Black-Forest-Labs)"
    const provider = m.name.includes("(")
      ? m.name.split("(").pop().replace(")", "").trim()
      : "Other";

    if (!groups[provider]) groups[provider] = [];
    groups[provider].push(m);
  });

  return groups;
}

// -------------------------------------------------------------
// Sort models inside each provider group by credits (best → cheapest)
// -------------------------------------------------------------
function sortByPerformance(groups) {
  const sorted = {};

  Object.keys(groups).forEach((provider) => {
    sorted[provider] = groups[provider].sort((a, b) => a.credits - b.credits);
  });

  return sorted;
}

// -------------------------------------------------------------
// Format for frontend dropdown
// -------------------------------------------------------------
export function getDropdownModels(nsfwEnabled = false) {
  const allCategories = {
    image: MODELS.image,
    video: MODELS.video,
    lipsync: MODELS.lipsync,
    tts: MODELS.tts,
  };

  const dropdown = {};

  Object.keys(allCategories).forEach((category) => {
    const models = allCategories[category];

    // Group by provider
    const grouped = groupByProvider(models);

    // Sort inside each provider
    const sorted = sortByPerformance(grouped);

    // Format for UI
    dropdown[category] = Object.keys(sorted).map((provider) => ({
      provider,
      models: sorted[provider].map((m) => ({
        id: m.id,
        name: m.name,
        credits: m.credits,
        nsfw: m.nsfw,
        locked: m.nsfw && m.locked && !nsfwEnabled,
      })),
    }));
  });

  return dropdown;
}
