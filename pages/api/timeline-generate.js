// pages/api/timeline-generate.js
//
// The Multi-Character Timeline. Submits the job and returns {jobId}
// immediately. UPDATED [Sep 4 2026]: the actual multi-pass generation
// (which can involve two sequential, multi-minute WaveSpeed video
// calls) no longer runs as one long background invocation — it's
// driven incrementally, one WaveSpeed check-in per browser poll, by
// pages/api/job-status.js. See utils/timelinePipeline.js's file header
// for the full story (a real customer's 4-character timeline got killed
// by Vercel's 300-second function ceiling under the old approach) and
// why this new one works the same on any Vercel plan, free or paid.
//
// REAL CONFIRMED ARCHITECTURE (researched against WaveSpeed's live
// API docs — see code comments in utils/runModel.js and
// utils/generateMask.js for sources):
//
//   - There is NO model anywhere (WaveSpeed, Replicate, HeyGen's
//     public API) that accepts more than 2 simultaneous speakers in a
//     single call. Every "multi-character" product on the market
//     (Dzine, HeyGen's app, Avatalk) achieves 3+ by layering
//     single/dual-speaker passes sequentially onto the same video —
//     same approach Runway/Domo/others take, they just don't surface
//     the pass structure to the user.
//
//   - Characters are sorted left-to-right and grouped into PAIRS.
//     Pass 1 is ONE call to infinitetalk/multi (image or video +
//     left_audio + right_audio + order) on the ORIGINAL scene — a
//     genuine native dual-speaker mode, bounding boxes aren't needed
//     for this pass, the model auto-detects left/right position.
//
//   - PAIRING [Aug 30 2026]: every pass after the first layers the
//     NEXT pair of characters onto the previous pass's video output,
//     using infinitetalk/video-to-video-multi (left_audio + right_audio
//     + a mask_image covering BOTH of that pair's tagged regions) —
//     confirmed via WaveSpeed's own docs that mask_image really is
//     supported on the dual endpoint, not just the solo one (see
//     utils/runModel.js). A leftover single character at the end (odd
//     character count) still gets the older masked SOLO pass. This
//     replaces the old hard "3 characters max, pass 2 is always a
//     single leftover character" design — a straight generalization,
//     not a rewrite of the underlying, already-shipped mechanism.
//
// Capped at MAX_CHARACTERS = 4 for now (2 passes total, same pass
// COUNT as the previous 3-character cap already shipped) rather than
// something larger. UPDATED [Sep 4 2026]: with the incremental
// step-per-poll architecture (see utils/timelinePipeline.js), an extra
// pair no longer risks the whole job getting killed by a platform
// duration ceiling — it just means more real wall-clock minutes for
// the user waiting on more WaveSpeed passes, and this pairing approach
// still hasn't been confirmed working end-to-end in production even
// once yet. Raise MAX_CHARACTERS further only after live testing
// confirms both quality and that the frontend's own poll timeout
// (utils/pollJob.js's MAX_POLL_MINUTES) comfortably covers however
// long that many real passes actually take; see CharacterTagger.jsx
// for the matching UI-side cap.

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { createJob, updateJob, generateJobId } from "../../middleware/jobStore.js";
import { submitWaveSpeed } from "../../utils/runModel.js";
import { buildTimelineSteps, resolveStepModel, buildStepInputs } from "../../utils/timelinePipeline.js";
import { getUserSettings } from "../../middleware/userSettingsStore.js";
import { hasTierAccess } from "../../middleware/tierCheck.js";
import { verifyUserId } from "../../middleware/verifyUserId.js";

const MAX_CHARACTERS = 4;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

// RESTRUCTURED [Sep 4 2026]: this route used to kick off the ENTIRE
// multi-pass generation (every WaveSpeed call, each one blocking for up
// to 10 minutes of polling) inside one background invocation via
// waitUntil — see utils/runModelAsync.js. That's what got a real
// customer's 4-character timeline killed by Vercel's Hobby-plan 300s
// ceiling: the invocation died mid-render with no chance to write a
// final status, leaving the job stuck "processing" forever.
//
// Now this route only ever does the FAST synchronous-safe part: submit
// step 1 (audio resolution + one WaveSpeed submit call, a few seconds
// at most) and return. Every step after that — including checking on
// step 1 — happens inside pages/api/job-status.js, one quick check-in
// per browser poll, exactly the pattern real AI video platforms use
// (confirmed against Replicate's/fal.ai's/HeyGen's own docs, Sep 2026).
// No single invocation anywhere in this pipeline ever needs to survive
// longer than one TTS call, one mask draw, or one WaveSpeed check-in —
// so this doesn't need Vercel Pro's longer duration limit at all; it
// works the same on the free Hobby plan. See utils/timelinePipeline.js
// for the step-building logic this shares with the cost estimate below.
export const maxDuration = 60;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId, scene, characters, blocks, clipSeconds, resolution, nsfwEnabled } =
      req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const auth = verifyUserId(req, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (!scene?.url) {
      return res.status(400).json({ error: "Missing scene image/video" });
    }
    if (!Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ error: "Need at least one tagged character" });
    }
    if (characters.length > MAX_CHARACTERS) {
      return res
        .status(400)
        .json({ error: `Maximum ${MAX_CHARACTERS} characters per timeline (for now)` });
    }
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ error: "Timeline has no dialogue blocks" });
    }

    const seconds = Math.max(5, Math.min(60, Number(clipSeconds) || 15));
    const res480 = resolution === "480p";
    const isVideo = scene.mediaType === "video";

    const soloModelId = isVideo
      ? res480
        ? "wavespeed-ai/infinitetalk-v2v-480p"
        : "wavespeed-ai/infinitetalk-v2v"
      : res480
      ? "wavespeed-ai/infinitetalk-480p"
      : "wavespeed-ai/infinitetalk";

    const multiModelId = isVideo
      ? "wavespeed-ai/infinitetalk-multi-v2v"
      : res480
      ? "wavespeed-ai/infinitetalk-multi-480p"
      : "wavespeed-ai/infinitetalk-multi";

    const layerModelId = res480 ? "wavespeed-ai/infinitetalk-v2v-480p" : "wavespeed-ai/infinitetalk-v2v";

    // Pass-2+ pairs always operate on the PREVIOUS pass's video output
    // (regardless of whether the original scene was a photo or video),
    // so this is always the video-to-video multi variant.
    const pairLayerModelId = res480
      ? "wavespeed-ai/infinitetalk-multi-v2v-480p"
      : "wavespeed-ai/infinitetalk-multi-v2v";

    const soloModel = findModelById(soloModelId);
    const multiModel = findModelById(multiModelId);
    const pairLayerModel = findModelById(pairLayerModelId);
    const layerModel = findModelById(layerModelId);

    if (!soloModel || !multiModel || !pairLayerModel || !layerModel) {
      return res.status(500).json({ error: "Internal model configuration error" });
    }

    const modelIds = { soloModelId, multiModelId, pairLayerModelId, layerModelId };

    // Characters sorted left-to-right — same ordering the pairing rules
    // in the file header describe. buildTimelineSteps() is the single
    // source of truth for which pass each character/pair belongs to;
    // used here for the NSFW/tier gate + cost estimate below, and again
    // by pages/api/job-status.js on every poll to drive the actual
    // generation — so there's exactly one copy of this pairing math,
    // not two that could quietly drift apart.
    const sortedCharacters = [...characters].sort((a, b) => (a.box?.left ?? 0) - (b.box?.left ?? 0));
    const steps = buildTimelineSteps(sortedCharacters);
    const modelsInPlay = steps.map((step) => resolveStepModel(step, modelIds)).filter(Boolean);

    if (modelsInPlay.length !== steps.length) {
      return res.status(500).json({ error: "Internal model configuration error" });
    }

    const blockedModel = modelsInPlay.find((m) => m.nsfw && m.locked && !nsfwEnabled);
    if (blockedModel) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    // Tier-gated models — see middleware/tierCheck.js. None of the
    // Timeline's InfiniteTalk model ids set minTier today, but this
    // closes the gap so one could be added later without a silent
    // bypass here (mirrors generate.js/lipsync.js/voice.js).
    const tierBlockedModel = modelsInPlay.find((m) => m.minTier);
    if (tierBlockedModel) {
      const { tier: userTier } = await getUserSettings(userId);
      if (!hasTierAccess(tierBlockedModel, userTier)) {
        return res.status(403).json({
          error: `This model requires the ${tierBlockedModel.minTier.charAt(0).toUpperCase()}${tierBlockedModel.minTier.slice(1)} plan.`,
        });
      }
    }

    const perSegment = (m) => Math.max(m.credits, Math.ceil(m.creditsPerSecond * seconds));

    // One real pass per entry in modelsInPlay — see the pairing note
    // above it.
    const totalCost = modelsInPlay.reduce((sum, m) => sum + perSegment(m), 0);

    const hasCredits = await checkCredits(userId, totalCost);
    if (!hasCredits) {
      return res.status(402).json({
        error: "Not enough credits for this timeline",
        creditsNeeded: totalCost,
      });
    }

    const jobId = generateJobId();

    // Everything the job needs to keep going lives on the job record
    // itself from the start — job-status.js has no memory between polls
    // (each one is a fresh, independent invocation), so scene/blocks/
    // userId/steps/modelIds all have to be data it can read back, not
    // values captured in a closure the way the old customRunner was.
    await createJob(jobId, {
      modelId: "multi-character-timeline",
      modelName: `Multi-Character Timeline (${characters.length} character${characters.length > 1 ? "s" : ""})`,
      userId,
      creditsToCharge: totalCost,
      category: "timeline",
      prompt: characters.map((c) => c.name).join(", "),
      pipeline: {
        kind: "timeline",
        scene,
        blocks,
        steps,
        modelIds,
        currentStepIndex: 0,
        currentVideoUrl: null,
        pendingRequestId: null,
      },
    });

    // Kick off step 1 right here, synchronously — resolving dialogue
    // audio (TTS/ffmpeg) and submitting to WaveSpeed both finish in a
    // few seconds, comfortably inside this route's own response time.
    // Every step after this (including checking on this one) happens in
    // pages/api/job-status.js. If step 1 itself fails to even submit,
    // mark the job failed right away instead of leaving it stuck
    // "processing" with nothing ever going to poll it forward.
    try {
      const step0Inputs = await buildStepInputs(steps[0], {
        scene,
        blocks,
        userId,
        currentVideoUrl: null,
      });
      const requestId = await submitWaveSpeed(modelsInPlay[0], step0Inputs);

      await updateJob(jobId, {
        pipeline: {
          kind: "timeline",
          scene,
          blocks,
          steps,
          modelIds,
          currentStepIndex: 0,
          currentVideoUrl: null,
          pendingRequestId: requestId,
        },
      });
    } catch (err) {
      console.error(`timeline-generate.js: step 1 submit failed for job ${jobId}:`, err.message);
      await updateJob(jobId, { status: "failed", error: err.message });
    }

    return res.status(202).json({
      success: true,
      jobId,
      creditsNeeded: totalCost,
      passCount: modelsInPlay.length,
    });
  } catch (err) {
    console.error("timeline-generate.js error:", err);
    return res.status(500).json({
      error: "Failed to start timeline generation",
      details: err.message,
    });
  }
}
