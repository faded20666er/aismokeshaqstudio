// utils/timelinePipeline.js
//
// The Multi-Character Timeline's actual generation logic, restructured
// [Sep 4 2026] to run as discrete, independently-triggerable STEPS
// instead of one long function that blocks through every pass.
//
// WHY THIS EXISTS: the old runTimelineGeneration() (previously inline in
// pages/api/timeline-generate.js) ran the whole multi-pass pipeline —
// audio resolution, mask generation, AND every WaveSpeed video call,
// each blocking for up to 10 minutes of polling — inside one continuous
// background function invocation. A real customer's 4-character timeline
// (2 passes) got killed mid-generation by Vercel's Hobby-plan 300-second
// function ceiling, and because the invocation died before it could
// write anything back, the job was left stuck "processing" forever with
// no error ever reaching the browser.
//
// Researched how real competitors avoid this (confirmed against
// Replicate's own official Next.js/Vercel guide, fal.ai's queue docs,
// and HeyGen's webhook/poll docs, Sep 2026): none of them block a single
// web request for the full render time. They submit a job, get an id
// back in under a second, and let something else check in on it
// repeatedly — each check-in fast, none of them long-running.
//
// So: this file only ever does FAST, synchronous-safe work (resolving
// dialogue audio via TTS/ffmpeg, drawing a mask image) and hands back
// what one WaveSpeed step needs — it never itself waits on a WaveSpeed
// render. pages/api/job-status.js (already polled by the browser every
// few seconds) is what actually submits each step and checks on it,
// exactly one quick step at a time, via submitWaveSpeed()/
// pollWaveSpeedOnce() in utils/runModel.js. This means the pipeline
// survives regardless of how long the FULL job takes, on any plan —
// no single invocation ever needs to run longer than one TTS call, one
// mask draw, and one WaveSpeed check-in.

import { getByokKey } from "../middleware/byokStore.js";
import { runModel } from "./runModel.js";
import { generateMaskFromBoxes, getImageDimensions } from "./generateMask.js";
import { mergeCharacterAudio } from "./mergeCharacterAudio.js";
import { findModelById } from "../models/index.js";

// Matches pages/api/voice.js's fallback id — see that file's comment
// for why: the fake Replicate/comingSoon "elevenlabs/v3" catalog entry
// was replaced by a real, WaveSpeed-routed "elevenlabs/eleven-v3" entry.
const FALLBACK_TTS_MODEL_ID = "elevenlabs/eleven-v3";

// Resolves ONE dialogue block into a real audio URL — either the user's
// uploaded file, or freshly synthesized TTS (ElevenLabs direct with the
// character's chosen voice, falling back to the Replicate TTS model on
// a 402 or any other ElevenLabs failure). Unchanged from the original
// timeline-generate.js implementation — just moved here so both the
// initial (step 0) submit and every later job-status.js poll can reuse
// exactly the same logic.
async function resolveBlockAudio(block, character, userId) {
  if (block.audioSource === "upload" && block.audioUrl) {
    return block.audioUrl;
  }

  if (block.audioSource === "tts" && block.text) {
    const voiceId = character.voice?.voiceId || character.voice?.id;

    if (voiceId) {
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
            body: JSON.stringify({ text: block.text, model_id: "eleven_v3" }),
          }
        );

        if (response.status === 402) {
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
        if (err.message.includes("ElevenLabs error")) throw err;
        console.warn(`ElevenLabs TTS failed, falling back to Replicate: ${err.message}`);
      }
    }

    const ttsModel = findModelById(FALLBACK_TTS_MODEL_ID);
    const ttsOutput = await runModel(ttsModel, { text: block.text });
    return Array.isArray(ttsOutput) ? ttsOutput[0] : ttsOutput;
  }

  return null;
}

// Resolves ALL of a character's dialogue blocks (not just the first —
// see the Aug 30 2026 bug fix this preserves) and merges them into one
// correctly-timed audio track.
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

// Computes the ordered list of steps for a timeline, given the
// already-sorted (left-to-right) character list. This is the single
// source of truth for the pairing rules described in
// pages/api/timeline-generate.js's file header — both the cost/model
// estimate in the submit handler AND the actual execution below call
// this same function, so there's no risk of the two drifting apart the
// way two hand-synced copies of the same math eventually would.
export function buildTimelineSteps(sortedCharacters) {
  if (sortedCharacters.length === 1) {
    return [{ kind: "solo-first", characters: [sortedCharacters[0]] }];
  }

  const steps = [{ kind: "multi-first", characters: [sortedCharacters[0], sortedCharacters[1]] }];
  const remaining = sortedCharacters.slice(2);

  for (let i = 0; i < remaining.length; i += 2) {
    const pair = remaining.slice(i, i + 2);
    steps.push(
      pair.length === 2 ? { kind: "pair-layer", characters: pair } : { kind: "solo-layer", characters: pair }
    );
  }

  return steps;
}

// Which resolved model a given step needs — kept as small id lookups on
// the job record (see pages/api/timeline-generate.js) rather than
// storing full model objects, so Redis is holding plain strings.
export function resolveStepModel(step, modelIds) {
  switch (step.kind) {
    case "solo-first":
      return findModelById(modelIds.soloModelId);
    case "multi-first":
      return findModelById(modelIds.multiModelId);
    case "pair-layer":
      return findModelById(modelIds.pairLayerModelId);
    case "solo-layer":
      return findModelById(modelIds.layerModelId);
    default:
      return null;
  }
}

async function resolveDimensions(scene) {
  if (scene.width && scene.height) return { width: scene.width, height: scene.height };
  if (scene.mediaType === "video") {
    throw new Error(
      "Missing video dimensions for the scene — please re-upload the scene video and try again."
    );
  }
  return getImageDimensions(scene.url);
}

// Resolves ONE step's WaveSpeed inputs (audio/mask only — never a
// WaveSpeed call itself). `currentVideoUrl` is the previous step's
// output (null for the very first step). Fast operations only — TTS
// fetch, ffmpeg audio merge, in-memory mask draw — never the slow part.
export async function buildStepInputs(step, { scene, blocks, userId, currentVideoUrl }) {
  if (step.kind === "solo-first") {
    const audioUrl = await resolveCharacterAudio(step.characters[0], blocks, userId);
    if (!audioUrl) {
      throw new Error(`No dialogue found for "${step.characters[0].name}"`);
    }
    return { face: scene.url, image: scene.url, video: scene.url, audio: audioUrl, prompt: "" };
  }

  if (step.kind === "multi-first") {
    const [leftChar, rightChar] = step.characters;
    const [leftAudio, rightAudio] = await Promise.all([
      resolveCharacterAudio(leftChar, blocks, userId),
      resolveCharacterAudio(rightChar, blocks, userId),
    ]);

    if (!leftAudio || !rightAudio) {
      throw new Error(
        `Missing dialogue for "${!leftAudio ? leftChar.name : rightChar.name}" — every character needs at least one line.`
      );
    }

    return {
      face: scene.url,
      image: scene.url,
      video: scene.url,
      leftAudio,
      rightAudio,
      order: "meanwhile",
      prompt: "",
    };
  }

  if (step.kind === "pair-layer") {
    const [pairLeft, pairRight] = step.characters;
    const { width, height } = await resolveDimensions(scene);
    const maskUrl = await generateMaskFromBoxes(step.characters.map((c) => c.box), width, height);
    const [pairLeftAudio, pairRightAudio] = await Promise.all([
      resolveCharacterAudio(pairLeft, blocks, userId),
      resolveCharacterAudio(pairRight, blocks, userId),
    ]);

    if (!pairLeftAudio || !pairRightAudio) {
      throw new Error(
        `Missing dialogue for "${!pairLeftAudio ? pairLeft.name : pairRight.name}" — every character needs at least one line.`
      );
    }

    return {
      video: currentVideoUrl,
      leftAudio: pairLeftAudio,
      rightAudio: pairRightAudio,
      order: "meanwhile",
      maskImage: maskUrl,
      prompt: "",
    };
  }

  // solo-layer — the odd leftover character at the end.
  const [soloChar] = step.characters;
  const { width, height } = await resolveDimensions(scene);
  const maskUrl = await generateMaskFromBoxes(step.characters.map((c) => c.box), width, height);
  const soloAudio = await resolveCharacterAudio(soloChar, blocks, userId);
  if (!soloAudio) {
    throw new Error(`Missing dialogue for "${soloChar.name}"`);
  }

  return { video: currentVideoUrl, audio: soloAudio, maskImage: maskUrl, prompt: "" };
}
