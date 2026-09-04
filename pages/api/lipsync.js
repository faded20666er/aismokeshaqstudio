// pages/api/lipsync.js
//
// Lipsync generation endpoint. Submits the job and returns {jobId}
// immediately rather than waiting inline — see generate.js for why
// (Vercel function duration limits vs. how long real video models
// take). The TTS pre-step (generating audio from a typed script, if
// no audio was uploaded) still runs synchronously here BEFORE
// submitting the job, since the lipsync model needs that real audio
// URL as an input — only the actual lipsync generation itself moves
// to the background.

import { put } from "@vercel/blob";
import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { createJob, generateJobId } from "../../middleware/jobStore.js";
import { startJobInBackground } from "../../utils/runModelAsync.js";
import { runModel } from "../../utils/runModel.js";
import { getUserSettings } from "../../middleware/userSettingsStore.js";
import { hasTierAccess } from "../../middleware/tierCheck.js";
import { verifyUserId } from "../../middleware/verifyUserId.js";

// UPDATED [Aug 31 2026]: the fake Replicate/comingSoon "elevenlabs/v3"
// catalog entry this pointed at was replaced by a real, WaveSpeed-routed
// "elevenlabs/eleven-v3" entry (see models/index.js) — this fallback id
// must match it exactly, or findModelById() below silently returns
// undefined and this whole script-to-speech pre-step breaks.
const FALLBACK_TTS_MODEL_ID = "elevenlabs/eleven-v3";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

export const maxDuration = 60;

async function uploadFileInput(file, prefix) {
  if (!file) return null;
  const matches = file.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return file;

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

    const auth = verifyUserId(req, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
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

    // Tier-gated models — see middleware/tierCheck.js. No lipsync model
    // currently sets minTier, but this closes the gap so one could be
    // added later without a silent bypass here (mirrors generate.js).
    if (model.minTier) {
      const { tier: userTier } = await getUserSettings(userId);
      if (!hasTierAccess(model, userTier)) {
        return res.status(403).json({
          error: `This model requires the ${model.minTier.charAt(0).toUpperCase()}${model.minTier.slice(1)} plan.`,
        });
      }
    }

    if (!inputs?.face) {
      return res.status(400).json({ error: "Missing face image/video" });
    }
    if (!inputs?.audio && !inputs?.prompt) {
      return res.status(400).json({
        error: "Provide either an audio file or a script for text-to-speech",
      });
    }

    const needsTts = !inputs.audio && !!inputs.prompt;
    const ttsModel = needsTts ? findModelById(FALLBACK_TTS_MODEL_ID) : null;

    let modelCost = model.credits;
    if (model.provider === "wavespeed" && model.creditsPerSecond) {
      const requestedSeconds = Math.max(5, Number(inputs.durationSeconds) || 5);
      const cappedSeconds = Math.min(requestedSeconds, model.maxDurationSeconds || 600);
      modelCost = Math.ceil(cappedSeconds * model.creditsPerSecond);
    }

    // Same per-character billing fix as pages/api/voice.js: the real
    // TTS model behind this pre-step (elevenlabs/eleven-v3, WaveSpeed)
    // is billed per character now, not a flat fake credits number — a
    // flat charge would undercharge on a long script the same way a
    // flat charge undercharges on long text in the standalone TTS
    // studio. Falls back to the flat ttsModel.credits for the rare case
    // a future fallback TTS model doesn't set creditsPerChar.
    const ttsCost = ttsModel
      ? ttsModel.creditsPerChar
        ? Math.max(1, Math.ceil((inputs.prompt?.length || 0) * ttsModel.creditsPerChar))
        : ttsModel.credits
      : 0;
    const totalCost = modelCost + ttsCost;

    const hasCredits = await checkCredits(userId, totalCost);
    if (!hasCredits) {
      return res.status(402).json({ error: "Not enough credits", creditsNeeded: totalCost });
    }

    // Face/audio upload + TTS pre-step run synchronously here — these
    // are fast and the background job needs the real URLs as input.
    const faceUrl = await uploadFileInput(inputs.face, "lipsync-face");
    let audioUrl = inputs.audio ? await uploadFileInput(inputs.audio, "lipsync-audio") : null;

    if (!audioUrl) {
      const ttsOutput = await runModel(ttsModel, { prompt: inputs.prompt });
      audioUrl = Array.isArray(ttsOutput) ? ttsOutput[0] : ttsOutput;
    }

    const jobId = generateJobId();
    await createJob(jobId, { modelId: model.id });

    startJobInBackground(jobId, model, { face: faceUrl, audio: audioUrl }, {
      userId,
      creditsToCharge: totalCost,
      recordHistory: true,
      category: "lipsync",
      prompt: inputs.prompt,
    });

    return res.status(202).json({
      success: true,
      jobId,
      model: model.id,
    });
  } catch (err) {
    console.error("lipsync.js error:", err);
    return res.status(500).json({
      error: "Failed to start lipsync generation",
      details: err.message,
    });
  }
}
