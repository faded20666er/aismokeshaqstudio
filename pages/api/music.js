// pages/api/music.js
//
// Music/song generation endpoint (ACE-Step via WaveSpeed — see
// models/index.js's "music" category for the real schema/pricing
// research). Submits the job and returns {jobId} immediately, same
// pattern as generate.js/lipsync.js/voice.js — ACE-Step songs can take
// a while to render (up to 4 minutes of audio), so this stays well
// under Vercel's function duration limits regardless of provider
// latency.

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { createJob, generateJobId } from "../../middleware/jobStore.js";
import { startJobInBackground } from "../../utils/runModelAsync.js";
import { getUserSettings } from "../../middleware/userSettingsStore.js";
import { hasTierAccess } from "../../middleware/tierCheck.js";
import { verifyUserId } from "../../middleware/verifyUserId.js";
import { checkRateLimit } from "../../middleware/rateLimit.js";

export const maxDuration = 60;

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

    // SECURITY [Sep 4 2026]: cap how fast one account can spam generation
    // submits — see middleware/rateLimit.js.
    const rl = await checkRateLimit("generation", userId, { limit: 30, windowSeconds: 300 });
    if (!rl.ok) {
      return res.status(429).json({
        error: `Too many requests — please wait ${rl.retryAfterSeconds}s and try again.`,
      });
    }

    if (!modelId) {
      return res.status(400).json({ error: "Missing modelId" });
    }

    const model = findModelById(modelId);

    if (!model || model.category !== "music") {
      return res.status(404).json({ error: "Music model not found" });
    }

    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    // Tier-gated models — see middleware/tierCheck.js. No music model
    // currently sets minTier, but this closes the gap so one could be
    // added later without a silent bypass here (mirrors generate.js /
    // lipsync.js / voice.js).
    if (model.minTier) {
      const { tier: userTier } = await getUserSettings(userId);
      if (!hasTierAccess(model, userTier)) {
        return res.status(403).json({
          error: `This model requires the ${model.minTier.charAt(0).toUpperCase()}${model.minTier.slice(1)} plan.`,
        });
      }
    }

    if (!inputs?.tags) {
      return res.status(400).json({ error: "Missing genre tags" });
    }

    // Real per-second billing (see models/index.js) — same pattern as
    // pages/api/lipsync.js's DomoAI/WaveSpeed per-second models: real
    // cost scales with requested duration, so a flat model.credits
    // charge would undercharge on a long song. Clamp to [5, max] to
    // match ACE-Step's own real duration bounds (5-240s) regardless of
    // what the client sends.
    let creditsToCharge = model.credits;
    if (model.creditsPerSecond) {
      const requestedSeconds = Math.max(5, Number(inputs.duration) || 60);
      const cappedSeconds = Math.min(requestedSeconds, model.maxDurationSeconds || 240);
      creditsToCharge = Math.max(1, Math.ceil(cappedSeconds * model.creditsPerSecond));
      inputs.duration = cappedSeconds;
    }

    const hasCredits = await checkCredits(userId, creditsToCharge);
    if (!hasCredits) {
      return res.status(402).json({ error: "Not enough credits" });
    }

    const jobId = generateJobId();
    await createJob(jobId, { modelId: model.id });

    startJobInBackground(jobId, model, inputs, {
      userId,
      creditsToCharge,
      recordHistory: true,
      category: "music",
      prompt: inputs.tags,
    });

    return res.status(202).json({
      success: true,
      jobId,
      model: model.id,
    });
  } catch (err) {
    console.error("music.js error:", err);
    return res.status(500).json({
      error: "Failed to start music generation",
      details: err.message,
    });
  }
}
