// pages/api/voice.js
//
// TTS / voice generation endpoint. Submits the job and returns
// {jobId} immediately, same pattern as generate.js/lipsync.js — TTS
// is usually fast, but this keeps every generation endpoint
// consistent and safely under Vercel's function duration limits
// regardless of provider latency spikes.
//
// When a specific ElevenLabs voiceId is provided, calls ElevenLabs'
// API directly instead of going through Replicate's wrapped
// elevenlabs/v3 model — Replicate's wrapper doesn't expose voice
// selection, only their own default voice.

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { getByokKey } from "../../middleware/byokStore.js";
import { createJob, generateJobId } from "../../middleware/jobStore.js";
import { startJobInBackground } from "../../utils/runModelAsync.js";
import { runModel } from "../../utils/runModel.js";
import { getUserSettings } from "../../middleware/userSettingsStore.js";
import { hasTierAccess } from "../../middleware/tierCheck.js";

export const maxDuration = 60;

async function runElevenLabsDirect(voiceId, text, apiKey) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        // SWITCHED [Aug 30 2026] from eleven_multilingual_v2 to
        // eleven_v3 — ElevenLabs' current most-expressive model.
        // Confirmed via their own docs (elevenlabs.io/docs/overview/
        // models): generally available, NOT plan-gated (works on the
        // same free-tier key we already use here), and it reads
        // bracketed audio-tag cues typed right into `text` — [excited],
        // [whispers], [laughs], [sad], etc. — and performs them. This
        // is what actually answers "voices with emotion" — v2 never
        // supported that regardless of which voice was picked. Costs
        // more credits per character than v2; worth watching usage
        // after this ships. See components/DialogueTimeline.jsx for
        // the matching UI hint that tells customers these tags exist.
        model_id: "eleven_v3",
      }),
    }
  );

  if (response.status === 402) {
    // Free-tier key (platform or BYOK) — signal caller to fall back.
    return null;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`ElevenLabs error (${response.status}): ${errText || response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
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

    if (!model || model.category !== "tts") {
      return res.status(404).json({ error: "TTS model not found" });
    }

    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    // Tier-gated models — see middleware/tierCheck.js. No TTS model
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

    const byokKey = await getByokKey(userId, "elevenlabs");
    const usingOwnKey = !!byokKey && !!inputs?.voiceId;

    const text = inputs?.text || inputs?.prompt;

    // Real per-character billing for models that carry creditsPerChar
    // (currently: elevenlabs/eleven-v3, routed through WaveSpeed's
    // metered ElevenLabs reseller — see models/index.js for the full
    // rationale). Mirrors the model.creditsByDuration precedent already
    // established in pages/api/generate.js for duration-billed video —
    // same problem, different axis: a flat model.credits charge would
    // undercharge on long text exactly the way a flat per-generation
    // price previously undercharged on long video durations. Falls back
    // to the flat model.credits for every other (non-per-character) TTS
    // model, same as before this change.
    const creditsToCharge = model.creditsPerChar
      ? Math.max(1, Math.ceil((text?.length || 0) * model.creditsPerChar))
      : model.credits;

    if (!usingOwnKey) {
      const hasCredits = await checkCredits(userId, creditsToCharge);
      if (!hasCredits) {
        return res.status(402).json({ error: "Not enough credits" });
      }
    }

    const jobId = generateJobId();
    await createJob(jobId, { modelId: model.id });

    // When the user has a BYOK key + voiceId, try ElevenLabs direct.
    // If that returns null (402 — free-tier key can't use library voices),
    // fall back to the standard Replicate TTS model without voice selection
    // rather than surfacing the 402 as a job failure.
    const customRunner = (byokKey && inputs?.voiceId)
      ? async () => {
          const result = await runElevenLabsDirect(inputs.voiceId, text, byokKey);
          if (result === null) {
            console.warn(`ElevenLabs BYOK key is free-tier (402) for voiceId ${inputs.voiceId} — falling back to Replicate TTS`);
            const fallbackOutput = await runModel(model, { text });
            return Array.isArray(fallbackOutput) ? fallbackOutput[0] : fallbackOutput;
          }
          return result;
        }
      : null;

    startJobInBackground(jobId, model, inputs, {
      userId,
      creditsToCharge: usingOwnKey ? 0 : creditsToCharge,
      recordHistory: true,
      category: "tts",
      prompt: text,
      customRunner,
    });

    return res.status(202).json({
      success: true,
      jobId,
      model: model.id,
      usingOwnKey,
    });
  } catch (err) {
    console.error("voice.js error:", err);
    return res.status(500).json({
      error: "Failed to start TTS generation",
      details: err.message,
    });
  }
}
