// pages/api/lipsync.js
//
// Lipsync generation endpoint. Moved here from the dead /api folder
// for the same reason as generate.js — Next.js only serves routes
// placed under /pages/api/*.
//
// Lipsync needs a face AND an audio track. The studio UI lets the user
// either upload audio directly, or type a script and let TTS generate
// the audio first — this endpoint handles both paths.

import { put } from "@vercel/blob";
import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { runModel } from "../../utils/runModel.js";

// A dependable default TTS model for the "type a script" fallback path.
const FALLBACK_TTS_MODEL_ID = "elevenlabs/v3";

// Next.js defaults API routes to a 1MB body limit, which a base64-encoded
// face photo or audio file blows past instantly (base64 also inflates
// file size by ~33%). This was the cause of the 413 "Payload Too Large"
// error — raising it here, scoped to just this route.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

async function uploadFileInput(file, prefix) {
  if (!file) return null;
  // file arrives from the frontend as a base64 data URL string (see
  // StudioPanel's file inputs) — convert back to a buffer for Blob.
  const matches = file.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return file; // already a URL, nothing to do

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

    if (!model || model.category !== "lipsync") {
      return res.status(404).json({ error: "Lipsync model not found" });
    }

    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    if (!inputs?.face) {
      return res.status(400).json({ error: "Missing face image/video" });
    }

    if (!inputs?.audio && !inputs?.prompt) {
      return res.status(400).json({
        error: "Provide either an audio file or a script for text-to-speech",
      });
    }

    // ---------------------------------------------------------
    // COST ESTIMATE — lipsync model cost, plus TTS cost if we need to
    // generate the audio ourselves from a typed script.
    // ---------------------------------------------------------
    const needsTts = !inputs.audio && !!inputs.prompt;
    const ttsModel = needsTts ? findModelById(FALLBACK_TTS_MODEL_ID) : null;
    const totalCost = model.credits + (ttsModel ? ttsModel.credits : 0);

    const hasCredits = await checkCredits(userId, totalCost);
    if (!hasCredits) {
      return res.status(402).json({ error: "Not enough credits", creditsNeeded: totalCost });
    }

    // ---------------------------------------------------------
    // Upload face/audio file inputs to Blob storage so providers can
    // fetch them by URL.
    // ---------------------------------------------------------
    const faceUrl = await uploadFileInput(inputs.face, "lipsync-face");
    let audioUrl = inputs.audio ? await uploadFileInput(inputs.audio, "lipsync-audio") : null;

    if (!audioUrl) {
      // No audio uploaded — generate it from the typed script first.
      const ttsOutput = await runModel(ttsModel, { prompt: inputs.prompt });
      audioUrl = Array.isArray(ttsOutput) ? ttsOutput[0] : ttsOutput;
    }

    const output = await runModel(model, { face: faceUrl, audio: audioUrl });

    const remaining = await deductCredits(userId, totalCost);

    return res.status(200).json({
      success: true,
      model: model.id,
      creditsUsed: totalCost,
      creditsRemaining: remaining,
      output,
    });
  } catch (err) {
    console.error("lipsync.js error:", err);
    return res.status(500).json({
      error: "Lipsync generation failed",
      details: err.message,
    });
  }
}
