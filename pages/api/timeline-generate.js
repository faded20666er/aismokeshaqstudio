// pages/api/timeline-generate.js
//
// The Multi-Character Timeline. Submits the job and returns {jobId}
// immediately — the actual multi-pass generation (which can involve
// two sequential, multi-minute WaveSpeed video calls) runs in the
// background via the same async job infrastructure as
// generate.js/lipsync.js/voice.js. See utils/runModelAsync.js for why
// this exists (Vercel function duration limits).
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
// something larger — every extra pair adds a full extra WaveSpeed
// video call inside the SAME background job invocation (see
// utils/runModelAsync.js's honest note on Vercel's real duration
// ceiling), and this pairing approach hasn't been confirmed working
// in production even once yet. Raise MAX_CHARACTERS further only
// after live testing confirms both quality AND that jobs reliably
// finish inside that ceiling; see CharacterTagger.jsx for the
// matching UI-side cap.

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { createJob, generateJobId } from "../../middleware/jobStore.js";
import { startJobInBackground } from "../../utils/runModelAsync.js";
import { runModel } from "../../utils/runModel.js";
import { generateMaskFromBoxes, getImageDimensions } from "../../utils/generateMask.js";
import { mergeCharacterAudio } from "../../utils/mergeCharacterAudio.js";
import { getByokKey } from "../../middleware/byokStore.js";
import { getUserSettings } from "../../middleware/userSettingsStore.js";
import { hasTierAccess } from "../../middleware/tierCheck.js";

const MAX_CHARACTERS = 4;
// UPDATED [Aug 31 2026]: the fake Replicate/comingSoon "elevenlabs/v3"
// catalog entry this pointed at was replaced by a real, WaveSpeed-routed
// "elevenlabs/eleven-v3" entry (see models/index.js) — this fallback id
// must match it exactly, or findModelById() below silently returns
// undefined and per-character dialogue audio generation breaks. Note:
// this internal TTS pre-step is NOT separately billed here (matches
// the pre-existing behavior from before this rename — totalCost below
// is driven entirely by the video model's own perSegment cost, same as
// always), so no billing-formula change was needed alongside this id fix.
const FALLBACK_TTS_MODEL_ID = "elevenlabs/eleven-v3";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export const maxDuration = 60;

// Resolves ONE dialogue block into a real audio URL — either the
// user's uploaded file, or freshly synthesized TTS (ElevenLabs direct
// with the character's chosen voice, falling back to the Replicate TTS
// model on a 402 or any other ElevenLabs failure). Pulled out as its
// own function so resolveCharacterAudio below can call it once per
// block instead of only ever looking at a character's first line.
async function resolveBlockAudio(block, character, userId) {
  if (block.audioSource === "upload" && block.audioUrl) {
    return block.audioUrl;
  }

  if (block.audioSource === "tts" && block.text) {
    const voiceId = character.voice?.voiceId || character.voice?.id;

    if (voiceId) {
      // Pro/Premium subscribers who've saved their own ElevenLabs key
      // (see middleware/byokStore.js, same pattern as pages/api/voice.js
      // and pages/api/elevenlabs-voices.js) bill ElevenLabs directly on
      // their own account/plan, bypassing the platform key's free-tier
      // "library voices not available via API" restriction.
      //
      // For free-tier users (no BYOK key), we still try ElevenLabs direct
      // with the platform key, but if it returns 402 (library voice blocked
      // on a free key), we fall through to the Replicate TTS fallback below
      // rather than failing the whole generation.
      const byokKey = userId ? await getByokKey(userId, "elevenlabs") : null;
      const apiKey = byokKey || process.env.ELEVENLABS_API_KEY;

      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            // eleven_v3 (not eleven_multilingual_v2) — see the comment
            // on the equivalent call in pages/api/voice.js for why:
            // more expressive, not plan-gated, and reads bracketed
            // audio-tag cues ([excited], [whispers], ...) typed right
            // into the dialogue line.
            body: JSON.stringify({ text: block.text, model_id: "eleven_v3" }),
          }
        );

        if (response.status === 402) {
          // Either the platform key or the user's own BYOK key is free-tier
          // and this voice requires a paid plan. Fall through to Replicate TTS.
          console.warn(`ElevenLabs 402 for voiceId ${voiceId} (byok=${!!byokKey}) — falling back to Replicate TTS`);
        } else {
          if (!response.ok) {
            const errText = await response.text().catch(() => "");
            throw new Error(`ElevenLabs error (${response.status}): ${errText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          return `data:audio/mpeg;base64,${base64}`;
        }
      } catch (err) {
        if (err.message.includes("ElevenLabs error")) throw err; // real error, rethrow
        // Network or unexpected error — fall through to Replicate TTS
        console.warn(`ElevenLabs TTS failed, falling back to Replicate: ${err.message}`);
      }
    }

    const ttsModel = findModelById(FALLBACK_TTS_MODEL_ID);
    const ttsOutput = await runModel(ttsModel, { text: block.text });
    return Array.isArray(ttsOutput) ? ttsOutput[0] : ttsOutput;
  }

  return null;
}

// BUG FIX [Aug 30 2026]: this used to resolve ONLY characterBlocks[0]
// and hand that single line straight to the generation model — every
// dialogue line after a character's first one in the Timeline was
// silently thrown away. A real customer hit exactly this: a 15-second
// timeline produced a 2-3 second clip containing only the first
// line's audio, because that line was, in fact, the entirety of what
// got sent. DialogueTimeline.jsx's own file comment says gaps between
// blocks are a supported, deliberate feature — this now resolves
// EVERY block belonging to the character and merges them into one
// audio track with each line placed at its real startTime (see
// utils/mergeCharacterAudio.js), because WaveSpeed's InfiniteTalk
// models take exactly one audio file per speaker — there's no
// "several timed clips" input on their side.
async function resolveCharacterAudio(character, blocks, userId) {
  const characterBlocks = blocks
    .filter((b) => b.characterId === character.id)
    .sort((a, b) => a.startTime - b.startTime);

  if (characterBlocks.length === 0) return null;

  const resolvedClips = [];
  for (const block of characterBlocks) {
    const url = await resolveBlockAudio(block, character, userId);
    if (url) {
      resolvedClips.push({ url, startTimeMs: Math.max(0, Math.round((block.startTime || 0) * 1000)) });
    }
  }

  if (resolvedClips.length === 0) return null;

  return mergeCharacterAudio(resolvedClips);
}

// The full multi-pass generation logic, run as a single customRunner
// inside the background job. Groups characters into pairs and chains
// one pass per pair (pass 1 native-dual on the original scene, every
// pass after that a masked dual pass on the PREVIOUS pass's video
// output); an odd leftover character at the end gets a masked SOLO
// pass, same mechanism the old 3-character path already used and
// shipped. See the file-level comment above for the real API basis.
async function runTimelineGeneration({ scene, characters, blocks, soloModel, multiModel, pairLayerModel, layerModel, userId }) {
  if (characters.length === 1) {
    const audioUrl = await resolveCharacterAudio(characters[0], blocks, userId);
    if (!audioUrl) {
      throw new Error(`No dialogue found for "${characters[0].name}"`);
    }

    const output = await runModel(soloModel, {
      face: scene.url,
      image: scene.url,
      video: scene.url,
      audio: audioUrl,
      prompt: "",
    });

    return Array.isArray(output) ? output[0] : output;
  }

  const sorted = [...characters].sort((a, b) => (a.box?.left ?? 0) - (b.box?.left ?? 0));

  // Real pixel dimensions, needed for any pass beyond the first (mask
  // building). Prefer what the browser captured at upload time
  // (scene.width/height — see components/SceneUpload.jsx) over
  // fetching + decoding scene.url here. That matters specifically for
  // VIDEO scenes: fetching + sharp-decoding scene.url only works for a
  // real photo — sharp is an image library and throws "Input buffer
  // contains unsupported image format" on video bytes every time. A
  // real customer hit exactly this crash on a video scene + 3rd
  // character before this was fixed [Aug 30 2026].
  async function resolveDimensions() {
    if (scene.width && scene.height) return { width: scene.width, height: scene.height };
    if (scene.mediaType === "video") {
      throw new Error(
        "Missing video dimensions for the scene — please re-upload the scene video and try again."
      );
    }
    return getImageDimensions(scene.url);
  }

  // Pass 1: the first pair, natively dual-synced on the original scene.
  const [leftChar, rightChar] = sorted;
  const [leftAudio, rightAudio] = await Promise.all([
    resolveCharacterAudio(leftChar, blocks, userId),
    resolveCharacterAudio(rightChar, blocks, userId),
  ]);

  if (!leftAudio || !rightAudio) {
    throw new Error(
      `Missing dialogue for "${!leftAudio ? leftChar.name : rightChar.name}" — every character needs at least one line.`
    );
  }

  const passOneOutput = await runModel(multiModel, {
    face: scene.url,
    image: scene.url,
    video: scene.url,
    leftAudio,
    rightAudio,
    order: "meanwhile",
    prompt: "",
  });

  let currentVideoUrl = Array.isArray(passOneOutput) ? passOneOutput[0] : passOneOutput;

  // Remaining characters (3rd, 4th, ...) get grouped into pairs and
  // layered one pass at a time, each pass masked to protect everyone
  // already synced in earlier passes.
  const remaining = sorted.slice(2);

  for (let i = 0; i < remaining.length; i += 2) {
    const pairChars = remaining.slice(i, i + 2);
    const { width, height } = await resolveDimensions();
    const maskUrl = await generateMaskFromBoxes(pairChars.map((c) => c.box), width, height);

    if (pairChars.length === 2) {
      const [pairLeft, pairRight] = pairChars;
      const [pairLeftAudio, pairRightAudio] = await Promise.all([
        resolveCharacterAudio(pairLeft, blocks, userId),
        resolveCharacterAudio(pairRight, blocks, userId),
      ]);

      if (!pairLeftAudio || !pairRightAudio) {
        throw new Error(
          `Missing dialogue for "${!pairLeftAudio ? pairLeft.name : pairRight.name}" — every character needs at least one line.`
        );
      }

      const passOutput = await runModel(pairLayerModel, {
        video: currentVideoUrl,
        leftAudio: pairLeftAudio,
        rightAudio: pairRightAudio,
        order: "meanwhile",
        maskImage: maskUrl,
        prompt: "",
      });

      currentVideoUrl = Array.isArray(passOutput) ? passOutput[0] : passOutput;
    } else {
      // Odd character left over at the end — same masked SOLO pass
      // the original 3-character path used.
      const [soloChar] = pairChars;
      const soloAudio = await resolveCharacterAudio(soloChar, blocks, userId);
      if (!soloAudio) {
        throw new Error(`Missing dialogue for "${soloChar.name}"`);
      }

      const passOutput = await runModel(layerModel, {
        video: currentVideoUrl,
        audio: soloAudio,
        maskImage: maskUrl,
        prompt: "",
      });

      currentVideoUrl = Array.isArray(passOutput) ? passOutput[0] : passOutput;
    }
  }

  return currentVideoUrl;
}

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

    // Mirrors runTimelineGeneration's own pairing loop just to know
    // which models are actually going to be called, for the NSFW/tier
    // gate checks and the cost estimate below — characters beyond the
    // first 2 are grouped into pairs (pairLayerModel), with a leftover
    // odd character getting a solo masked pass (layerModel).
    const extraPassCount = Math.max(0, characters.length - 2);
    const fullPairPasses = Math.floor(extraPassCount / 2);
    const hasOddLeftover = extraPassCount % 2 === 1;

    const modelsInPlay = [];
    if (characters.length === 1) {
      modelsInPlay.push(soloModel);
    } else {
      modelsInPlay.push(multiModel);
      for (let i = 0; i < fullPairPasses; i++) modelsInPlay.push(pairLayerModel);
      if (hasOddLeftover) modelsInPlay.push(layerModel);
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
    await createJob(jobId, { modelId: "multi-character-timeline" });

    startJobInBackground(
      jobId,
      { id: "multi-character-timeline", name: `Multi-Character Timeline (${characters.length} character${characters.length > 1 ? "s" : ""})` },
      null,
      {
        userId,
        creditsToCharge: totalCost,
        recordHistory: true,
        category: "timeline",
        prompt: characters.map((c) => c.name).join(", "),
        customRunner: () =>
          runTimelineGeneration({
            scene,
            characters,
            blocks,
            soloModel,
            multiModel,
            pairLayerModel,
            layerModel,
            userId,
          }),
      }
    );

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
