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
//     single/dual-speaker passes sequentially onto the same video.
//
//   - For 2 characters: ONE call to infinitetalk/multi (image or
//     video + left_audio + right_audio + order). This is a genuine
//     native dual-speaker mode — bounding boxes are NOT needed here,
//     the model auto-detects left/right position in the frame.
//
//   - For a 3rd character: a SECOND pass using infinitetalk
//     video-to-video on the pass-1 OUTPUT, with a mask_image that
//     only exposes character 3's tagged face region — this protects
//     characters 1 & 2's already-synced faces from being re-touched.
//
// Capped at 3 characters for launch (not 5) specifically because this
// sequential-layering approach is unverified in production — pass 2
// carries real risk of visible seams/artifacts where the mask
// boundary sits. Raise MAX_CHARACTERS only after live testing
// confirms quality holds up; see CharacterTagger.jsx for the matching
// UI-side cap.

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { createJob, generateJobId } from "../../middleware/jobStore.js";
import { startJobInBackground } from "../../utils/runModelAsync.js";
import { runModel } from "../../utils/runModel.js";
import { generateMaskFromBox, getImageDimensions } from "../../utils/generateMask.js";
import { getByokKey } from "../../middleware/byokStore.js";

const MAX_CHARACTERS = 3;
const FALLBACK_TTS_MODEL_ID = "elevenlabs/v3";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export const maxDuration = 60;

async function resolveCharacterAudio(character, blocks, userId) {
  const characterBlocks = blocks
    .filter((b) => b.characterId === character.id)
    .sort((a, b) => a.startTime - b.startTime);

  if (characterBlocks.length === 0) return null;

  const block = characterBlocks[0];

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
            body: JSON.stringify({ text: block.text, model_id: "eleven_multilingual_v2" }),
          }
        );

        if (response.status === 402 && !byokKey) {
          // Platform key is free-tier and this voice requires a paid plan.
          // Fall through to Replicate TTS fallback below.
          console.warn(`ElevenLabs 402 for voiceId ${voiceId} on platform key — falling back to Replicate TTS`);
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

// The full multi-pass generation logic, run as a single customRunner
// inside the background job — covers solo, 2-character, and
// 3-character (with masked layering) paths exactly as before, just
// moved out of the synchronous request/response cycle.
async function runTimelineGeneration({ scene, characters, blocks, soloModel, multiModel, layerModel, userId }) {
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
  const [leftChar, rightChar, thirdChar] = sorted;

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

  const passOneUrl = Array.isArray(passOneOutput) ? passOneOutput[0] : passOneOutput;

  if (!thirdChar) {
    return passOneUrl;
  }

  const thirdAudio = await resolveCharacterAudio(thirdChar, blocks, userId);
  if (!thirdAudio) {
    throw new Error(`Missing dialogue for "${thirdChar.name}"`);
  }

  const { width, height } = await getImageDimensions(scene.url);
  const maskUrl = await generateMaskFromBox(thirdChar.box, width, height);

  const passTwoOutput = await runModel(layerModel, {
    video: passOneUrl,
    audio: thirdAudio,
    maskImage: maskUrl,
    prompt: "",
  });

  return Array.isArray(passTwoOutput) ? passTwoOutput[0] : passTwoOutput;
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

    const soloModel = findModelById(soloModelId);
    const multiModel = findModelById(multiModelId);
    const layerModel = findModelById(layerModelId);

    if (!soloModel || !multiModel || !layerModel) {
      return res.status(500).json({ error: "Internal model configuration error" });
    }

    const modelsInPlay =
      characters.length === 1 ? [soloModel] : characters.length === 2 ? [multiModel] : [multiModel, layerModel];

    const blockedModel = modelsInPlay.find((m) => m.nsfw && m.locked && !nsfwEnabled);
    if (blockedModel) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    const perSegment = (m) => Math.max(m.credits, Math.ceil(m.creditsPerSecond * seconds));

    let totalCost;
    if (characters.length === 1) {
      totalCost = perSegment(soloModel);
    } else if (characters.length === 2) {
      totalCost = perSegment(multiModel);
    } else {
      totalCost = perSegment(multiModel) + perSegment(layerModel);
    }

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
          runTimelineGeneration({ scene, characters, blocks, soloModel, multiModel, layerModel, userId }),
      }
    );

    return res.status(202).json({
      success: true,
      jobId,
      creditsNeeded: totalCost,
      passCount: characters.length > 2 ? 2 : 1,
    });
  } catch (err) {
    console.error("timeline-generate.js error:", err);
    return res.status(500).json({
      error: "Failed to start timeline generation",
      details: err.message,
    });
  }
}
