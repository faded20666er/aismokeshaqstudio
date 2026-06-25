// pages/api/generate.js
//
// Main image/video generation endpoint. This used to live at
// /api/generate.js (a folder Next.js never reads — only /pages/api/*
// is wired up to real URLs). Moving it here is what actually makes
// fetch('/api/generate') from the studio UI work.

import { put } from "@vercel/blob";
import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { runModel } from "../../utils/runModel.js";

// Raise the body limit above Next.js's 1MB default — a base64-encoded
// reference image easily exceeds that on its own.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

async function uploadFileInput(file, prefix) {
  if (!file) return null;
  const matches = file.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return file; // already a URL

  const buffer = Buffer.from(matches[2], "base64");
  const blob = await put(`${prefix}-${Date.now()}`, buffer, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { modelId, inputs, userId, nsfwEnabled } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!modelId) {
      return res.status(400).json({ error: "Missing modelId" });
    }

    const model = findModelById(modelId);

    if (!model || (model.category !== "image" && model.category !== "video")) {
      return res.status(404).json({ error: "Model not found" });
    }

    // ---------------------------------------------------------
    // NSFW LOCK CHECK
    // ---------------------------------------------------------
    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    // ---------------------------------------------------------
    // CREDIT CHECK
    // ---------------------------------------------------------
    const hasCredits = await checkCredits(userId, model.credits);

    if (!hasCredits) {
      return res.status(402).json({
        error: "Not enough credits",
      });
    }

    // ---------------------------------------------------------
    // UPLOAD ANY FILE INPUT (optional reference image) TO BLOB
    // ---------------------------------------------------------
    if (inputs?.images && Array.isArray(inputs.images)) {
      inputs.images = await Promise.all(
        inputs.images.map((img) => uploadFileInput(img, "generate-ref"))
      );
      inputs.image = inputs.images[0]; // backwards-compat for single-image models
    } else if (inputs?.image) {
      inputs.image = await uploadFileInput(inputs.image, "generate-ref");
    }

    // ---------------------------------------------------------
    // RUN MODEL
    // ---------------------------------------------------------
    const output = await runModel(model, inputs);

    // ---------------------------------------------------------
    // DEDUCT CREDITS (only after a successful generation)
    // ---------------------------------------------------------
    const remaining = await deductCredits(userId, model.credits);

    return res.status(200).json({
      success: true,
      model: model.id,
      creditsUsed: model.credits,
      creditsRemaining: remaining,
      output,
    });
  } catch (err) {
    console.error("generate.js error:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err.message,
    });
  }
}
