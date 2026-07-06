// utils/runModel.js
//
// Shared "actually call the AI provider" logic. This was previously
// copy-pasted three times across api/generate.js, api/lipsync.js, and
// api/voice.js with no functional differences — consolidated here so a
// fix only has to happen once.
//
// IMPORTANT: HuggingFace retired the old api-inference.huggingface.co
// endpoint and moved to "Inference Providers" — a system that routes
// each request through a specific named partner (nscale, together,
// fal-ai, etc.), with the actual underlying URL differing per provider.
// Hand-rolling the raw HTTP call isn't reliable anymore since the URL
// isn't fixed — their own @huggingface/inference SDK handles provider
// routing correctly, so we use that instead of fetch() directly.

import Replicate from "replicate";
import { InferenceClient } from "@huggingface/inference";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Vercel's Development environment got a locked/stuck HUGGINGFACE_API_KEY
// row that couldn't be edited or removed through the dashboard — the
// workaround was creating a separate HUGGINGFACE_API_KEY_DEV variable.
// This falls back to that if the primary one isn't set, so local dev
// works via _DEV while production keeps using the normal name.
const hf = new InferenceClient(
  process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY_DEV
);

async function runHuggingFace(model, inputs) {
  const { id: modelId, category } = model;

  if (category === "tts") {
    // hf.textToSpeech expects the spoken text directly, no "inputs" wrapper.
    // Pass voice in parameters so Kokoro (and similar multi-voice models) can
    // honour the user's voice selection — HF inference providers forward
    // unknown parameters to the underlying model, so this is safe to include
    // even for models that don't use it.
    const ttsParams = {};
    if (inputs.voice) ttsParams.voice = inputs.voice;
    const audioBlob = await hf.textToSpeech({
      model: modelId,
      inputs: inputs.text || inputs.prompt,
      ...(Object.keys(ttsParams).length > 0 ? { parameters: ttsParams } : {}),
    });

    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audioBlob.type || "audio/wav";

    return `data:${mimeType};base64,${base64}`;
  }

  // Image-to-video (I2V) models: hf.imageToVideo() added in SDK 4.x.
  // Requires an input image blob; prompt goes in parameters.
  if (category === "video" && model.imageInputs && model.imageInputs.min > 0) {
    const imageDataUrl =
      inputs.image || (Array.isArray(inputs.images) ? inputs.images[0] : null);
    if (!imageDataUrl) {
      throw new Error(`${model.name || modelId} requires an input image.`);
    }
    // generate.js pre-uploads images to Vercel Blob before the job runs,
    // so inputs.image arrives here as an HTTPS URL, not a base64 data URL.
    // Handle both cases so this works regardless of upload path.
    let imageBlob;
    if (imageDataUrl.startsWith("http://") || imageDataUrl.startsWith("https://")) {
      const imgFetch = await fetch(imageDataUrl);
      if (!imgFetch.ok) {
        throw new Error(`Failed to fetch image for I2V (${imgFetch.status}): ${imageDataUrl}`);
      }
      const imgBuffer = await imgFetch.arrayBuffer();
      const contentType = imgFetch.headers.get("content-type") || "image/jpeg";
      imageBlob = new Blob([imgBuffer], { type: contentType });
    } else {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image data for I2V model.");
      const [, imgMime, imgB64] = match;
      imageBlob = new Blob([Buffer.from(imgB64, "base64")], { type: imgMime });
    }

    // fal-ai is the default "auto" provider but rejects NSFW community models.
    // wavespeed is also listed as "live" for this model and works correctly.
    const videoBlob = await hf.imageToVideo({
      model: modelId,
      inputs: imageBlob,
      provider: "wavespeed",
      parameters: {
        ...(inputs.prompt ? { prompt: inputs.prompt } : {}),
      },
    });

    const videoBuffer = await videoBlob.arrayBuffer();
    const videoBase64 = Buffer.from(videoBuffer).toString("base64");
    const videoMime = videoBlob.type || "video/mp4";
    return `data:${videoMime};base64,${videoBase64}`;
  }

  // Text-to-video for HF T2V models (e.g. Lightricks/LTX-Video).
  // hf.textToVideo() was added in @huggingface/inference SDK 4.x — fall back
  // to the generic hf.request() for older installs. Both return a video Blob.
  if (category === "video") {
    let videoBlob;
    if (typeof hf.textToVideo === "function") {
      videoBlob = await hf.textToVideo({
        model: modelId,
        inputs: inputs.prompt,
      });
    } else {
      videoBlob = await hf.request({
        model: modelId,
        inputs: inputs.prompt,
      });
    }
    const videoBuffer = await videoBlob.arrayBuffer();
    const videoMime = videoBlob.type || "video/mp4";
    return `data:${videoMime};base64,${Buffer.from(videoBuffer).toString("base64")}`;
  }

  // Text-to-image (default for image-category HuggingFace models)
  const imageBlob = await hf.textToImage({
    model: modelId,
    inputs: inputs.prompt,
  });

  const arrayBuffer = await imageBlob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = imageBlob.type || "image/png";

  return `data:${mimeType};base64,${base64}`;
}

// ---------------------------------------------------------------------------
// Cloudflare Workers AI
// Free tier resets daily — no monthly cap that can be permanently exhausted.
// Endpoint: POST /accounts/{id}/ai/run/{model-slug}
// Image models return raw binary bytes (not JSON), so we read as ArrayBuffer.
// ---------------------------------------------------------------------------
async function runCloudflare(model, inputs) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      "Cloudflare credentials missing — add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to Vercel environment variables."
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model.id}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: inputs.prompt }),
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.errors?.[0]?.message || msg;
    } catch {}
    throw new Error(`Cloudflare AI error (${res.status}): ${msg}`);
  }

  // Image generation models return raw binary — read as buffer, encode base64
  const buf = await res.arrayBuffer();
  const ct = res.headers.get("content-type") || "image/jpeg";
  return `data:${ct};base64,${Buffer.from(buf).toString("base64")}`;
}

// CONFIRMED REAL FIELD NAMES for reference-image inputs, per Replicate
// model. Every model names this differently — sending the wrong field
// name doesn't error, it just gets silently ignored, so the model
// falls back to pure text-to-image and ignores the user's uploaded
// reference photos entirely. This map is the fix for that.
//
// Sources (checked against Replicate's own schema/docs, not guessed):
//   - google/nano-banana-2 -> "image_input" (Replicate schema, confirmed
//     via community/n8n integration thread quoting the real schema)
//   - black-forest-labs/flux-2-* -> "input_images" (Replicate's own
//     page text: "...Use FLUX.2 [pro] with an API ... input_images.
//     file[]. Add multiple files...")
//
// Models NOT yet in this map fall through to sending the array under
// SEVERAL common aliases at once (see FALLBACK_IMAGE_FIELDS below) —
// safer than guessing one name and risking another silent miss. As
// each additional model gets confirmed through real testing, add its
// real field name here instead of relying on the fallback.
// Values can be:
//   string   → send all images as array under this single field name
//   string[] → positional mapping: images[0]→field[0], images[1]→field[1], etc.
//              (used for models with named start/end/reference frame slots)
const IMAGE_FIELD_BY_MODEL = {
  // Image models
  "google/nano-banana-2":              "image_input",     // confirmed
  "black-forest-labs/flux-2-pro":      "input_images",    // confirmed (max 8)
  "black-forest-labs/flux-2-flex":     "input_images",    // confirmed
  "bytedance/seedream-5-lite":         "image_input",     // confirmed
  "wan-video/wan-2.7-image-pro":       "images",          // confirmed (array)
  "ideogram-ai/ideogram-v3-turbo":     "image",           // confirmed (content ref)
  "ideogram-ai/ideogram-v2":           "image",           // confirmed
  "fermatresearch/sdxl-controlnet-lora": "image",         // confirmed (control image)
  "lucataco/ssd-1b":                   "image",           // confirmed (img2img)
  // Video models — single image
  "runwayml/gen-4.5":                  "image",
  "google/veo-2":                      "image",
  "google/veo-3.1":                    "image",           // reference_images handled separately
  "xai/grok-imagine-video":            "image",
  "bytedance/dreamactor-m2.0":         "image",           // REQUIRED character image
  "wan-video/wan-2.5-i2v-fast":        "image",           // REQUIRED: I2V start frame
  "wan-video/wan-2.2-s2v":             "image",           // optional face
  "minimax/hailuo-2.3":                "first_frame_image",
  "minimax/video-01":                  "first_frame_image",
  "prunaai/p-video-animate":           "image",           // REQUIRED still image
  "prunaai/p-video-avatar":            "image",           // REQUIRED face image
  "alibaba/happyhorse-1.0":            "image",
  "veed/fabric-1.0":                   "image",
  // Video models — multi-slot positional (images array maps to named frame slots)
  "kwaivgi/kling-v3-video":            ["start_image", "end_image"],
  "kwaivgi/kling-v3-omni-video":       ["start_image", "end_image"],
  "kwaivgi/kling-v2.5-turbo-pro":      ["start_image", "end_image"],
  "kwaivgi/kling-v2.0":                ["start_image"],
  "bytedance/seedance-2.0":            ["image", "last_frame_image"],
  "bytedance/seedance-1.5-pro":        ["image", "last_frame_image"],
  "bytedance/seedance-1-pro":          ["image", "last_frame_image"],
  "bytedance/seedance-1-lite":         ["image", "last_frame_image"],
  "prunaai/p-video":                   ["image", "last_frame_image"],
  // ToonCrafter: up to 10 named image slots for interpolation
  "fofr/tooncrafter": [
    "image_1","image_2","image_3","image_4","image_5",
    "image_6","image_7","image_8","image_9","image_10",
  ],
};

// Unconfirmed models get the array duplicated under all of these
// field names simultaneously. Extra fields a model doesn't recognize
// are simply ignored by Replicate — there's no penalty for sending
// more than needed, only for sending the wrong one and nothing else.
const FALLBACK_IMAGE_FIELDS = ["image_input", "input_images", "images", "image"];

function buildReplicateInput(model, inputs) {
  const modelId = model.id;
  const images = inputs.images || (inputs.image ? [inputs.image] : null);

  let result = inputs;

  if (images && images.length > 0) {
    const confirmedField = IMAGE_FIELD_BY_MODEL[modelId];
    const { images: _images, image: _image, ...rest } = inputs;

    if (confirmedField) {
      if (Array.isArray(confirmedField)) {
        // Positional mapping: images[i] → confirmedField[i]
        // Extra images beyond the field list are silently dropped.
        const slots = {};
        confirmedField.forEach((fieldName, i) => {
          if (images[i] !== undefined) slots[fieldName] = images[i];
        });
        result = { ...rest, ...slots };
      } else {
        result = { ...rest, [confirmedField]: images };
      }
    } else {
      const fallbackPayload = {};
      for (const field of FALLBACK_IMAGE_FIELDS) {
        fallbackPayload[field] = field === "image" ? images[0] : images;
      }
      result = { ...rest, ...fallbackPayload };
    }
  }

  // Replicate enables a safety checker by default on the FLUX base
  // model, the SDXL base model, AND all derivative fine-tunes of
  // both (confirmed via Replicate's own docs:
  // replicate.com/docs/topics/predictions/safety-checking). Flagged
  // content doesn't error — it silently returns a BLACK image
  // instead, with no indication anything went wrong. For models we've
  // deliberately catalogued as NSFW (model.nsfw === true) and that
  // are FLUX/SDXL derivatives, explicitly disable the checker so real
  // NSFW generations don't come back blank. This must NOT be applied
  // to non-NSFW models — the checker is a real safety feature for
  // everyone else.
  if (model.nsfw && isFluxOrSdxlDerivative(modelId)) {
    result = { ...result, disable_safety_checker: true };
  }

  return result;
}

// Heuristic for "is this a FLUX or SDXL derivative on Replicate" —
// covers the models currently in the catalog (aisha-ai-official's
// nsfw-flux-dev is a FLUX.1-dev fine-tune). Add more match patterns
// here if future NSFW additions are built on a different base model
// that also has this safety-checker behavior.
function isFluxOrSdxlDerivative(modelId) {
  const lower = modelId.toLowerCase();
  return lower.includes("flux") || lower.includes("sdxl") || lower.includes("stable-diffusion");
}

async function runReplicate(model, inputs) {
  const translatedInput = buildReplicateInput(model, inputs);
  return replicate.run(model.id, { input: translatedInput });
}

// WaveSpeed's API is submit-then-poll, not a single synchronous call
// like Replicate's .run(). modelId here is the WaveSpeed model slug
// (e.g. "wavespeed-ai/infinitetalk"), with the resolution baked into
// which catalog entry was chosen (see models/index.js — the "-480p"
// id maps to the same underlying endpoint with resolution: "480p").
//
// The "-multi" catalog entries map to the real infinitetalk/multi
// endpoint, which has a genuinely different shape than the
// single-person endpoint: it takes left_audio + right_audio (not one
// "audio" field) plus an "order" param controlling whether the two
// speakers talk simultaneously or take turns. Confirmed against
// WaveSpeed's live API docs — do not change these field names without
// re-checking the docs, they are NOT the same shape as the single
// endpoint.
async function runWaveSpeed(modelId, inputs) {
  const isMulti = modelId.includes("-multi");
  const isV2V = modelId.includes("-v2v");
  const resolution = modelId.endsWith("-480p") ? "480p" : "720p";

  let realModelSlug;
  let body;

  if (isMulti) {
    realModelSlug = isV2V
      ? "wavespeed-ai/infinitetalk/video-to-video-multi"
      : "wavespeed-ai/infinitetalk/multi";

    body = {
      [isV2V ? "video" : "image"]: inputs.face || inputs.image || inputs.video,
      left_audio: inputs.leftAudio,
      right_audio: inputs.rightAudio,
      order: inputs.order || "meanwhile", // "meanwhile" | "left_right" | "right_left"
      prompt: inputs.prompt || "",
      resolution,
      seed: -1,
    };
  } else {
    realModelSlug = isV2V
      ? "wavespeed-ai/infinitetalk/video-to-video"
      : "wavespeed-ai/infinitetalk";

    body = {
      [isV2V ? "video" : "image"]: inputs.face || inputs.image || inputs.video,
      audio: inputs.audio,
      prompt: inputs.prompt || "",
      resolution,
      seed: -1,
    };

    // mask_image only applies to the video-to-video endpoint — it
    // restricts which region of the frame is allowed to animate. Used
    // by the Multi-Character Timeline to protect already-synced faces
    // when layering a 3rd character's dialogue onto a clip that
    // already has characters 1 & 2 talking.
    if (isV2V && inputs.maskImage) {
      body.mask_image = inputs.maskImage;
    }
  }

  const submitRes = await fetch(`https://api.wavespeed.ai/api/v3/${realModelSlug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WAVESPEED_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => "");
    throw new Error(`WaveSpeed submit error (${submitRes.status}): ${text || submitRes.statusText}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData?.data?.id || submitData?.id;

  if (!requestId) {
    throw new Error("WaveSpeed did not return a prediction id");
  }

  // Poll until completed — WaveSpeed jobs can take a while for long
  // durations (their own docs cite ~10-30s of wall time per 1s of video).
  const maxAttempts = 120; // up to ~10 minutes of polling at 5s intervals
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const pollRes = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
      {
        headers: { Authorization: `Bearer ${process.env.WAVESPEED_API_KEY}` },
      }
    );

    if (!pollRes.ok) continue; // transient error, keep polling

    const pollData = await pollRes.json();
    const status = pollData?.data?.status;

    if (status === "completed") {
      return pollData.data.outputs?.[0];
    }

    if (status === "failed") {
      throw new Error(pollData?.data?.error || "WaveSpeed generation failed");
    }
    // status is "processing" or "queued" — keep polling
  }

  throw new Error("WaveSpeed generation timed out after 10 minutes of polling");
}

// Atlas Cloud: submit-then-poll, same general shape as WaveSpeed but
// with its own endpoints/response shape (confirmed against Atlas
// Cloud's own published docs at atlascloud.ai — generateVideo /
// generateImage to submit, then GET /prediction/{id} to poll, with
// status values "processing" | "completed" | "succeeded" | "failed").
//
// model.atlasCloudType distinguishes "video" vs "image" generation
// since they hit different submit endpoints.
async function runAtlasCloud(model, inputs) {
  const isVideo = model.atlasCloudType === "video";
  const submitUrl = isVideo
    ? "https://api.atlascloud.ai/api/v1/model/generateVideo"
    : "https://api.atlascloud.ai/api/v1/model/generateImage";

  const body = { model: model.id };

  if (isVideo) {
    // Wan 2.2/2.7 Spicy and Seedance Spicy all take "image" (first
    // frame) + "prompt" + "duration" + "resolution". The "infinite"
    // variant's prompt field is a JSON ARRAY of per-segment prompts,
    // not a plain string — confirmed in Atlas Cloud's docs ("Must be
    // a JSON array. Plain string is rejected."). Non-infinite variants
    // take a plain string prompt.
    body.image = inputs.face || inputs.image;
    body.prompt = model.id.includes("infinite")
      ? Array.isArray(inputs.prompt)
        ? inputs.prompt
        : [inputs.prompt || ""]
      : inputs.prompt || "";
    body.duration = inputs.duration || 5;
    body.resolution = inputs.resolution || "720p";
    if (typeof inputs.seed === "number") body.seed = inputs.seed;
  } else {
    body.prompt = inputs.prompt || "";
    if (inputs.width) body.width = inputs.width;
    if (inputs.height) body.height = inputs.height;
  }

  const submitRes = await fetch(submitUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ATLASCLOUD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => "");
    throw new Error(`Atlas Cloud submit error (${submitRes.status}): ${text || submitRes.statusText}`);
  }

  const submitData = await submitRes.json();
  const predictionId = submitData?.data?.id;

  if (!predictionId) {
    throw new Error("Atlas Cloud did not return a prediction id");
  }

  // Video generation can take a while; images are fast but polling
  // works the same way either way, so use one loop for both.
  const maxAttempts = isVideo ? 120 : 30; // ~10min video / ~2.5min image
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const pollRes = await fetch(
      `https://api.atlascloud.ai/api/v1/model/prediction/${predictionId}`,
      { headers: { Authorization: `Bearer ${process.env.ATLASCLOUD_API_KEY}` } }
    );

    if (!pollRes.ok) continue; // transient error, keep polling

    const pollData = await pollRes.json();
    const status = pollData?.data?.status;

    if (status === "completed" || status === "succeeded") {
      return pollData.data.outputs?.[0];
    }

    if (status === "failed") {
      throw new Error(pollData?.data?.error || "Atlas Cloud generation failed");
    }
    // status is "processing" — keep polling
  }

  throw new Error("Atlas Cloud generation timed out");
}

// DomoAI Enterprise API — submit-then-poll, same pattern as Atlas Cloud.
// Base URL: https://api.domoai.com
// Auth: Bearer DOMOAI_API_KEY
// Submit: POST /v1/video/{category} → { code:0, data:{ task_id } }
// Poll:   GET  /v1/tasks/{task_id}  → { code:0, data:{ status, output_videos:[{url}] } }
// Statuses: PENDING | QUEUING | PROCESSING | SUCCESS | FAILED | CANCELED
//
// model.domoAICategory: "image2video" | "text2video" | "talking-avatar"
// model.domoAIModel: the exact model string DomoAI expects (e.g. "animate-2.4-faster")
//
// Image/audio inputs arrive as full data URLs ("data:image/jpeg;base64,...").
// DomoAI wants only the base64 portion (no prefix) in bytes_base64_encoded.
async function runDomoAI(model, inputs) {
  const apiKey = process.env.DOMOAI_API_KEY;
  if (!apiKey) throw new Error("DOMOAI_API_KEY is not set");

  const BASE = "https://api.domoai.com";

  // Strip "data:<mime>;base64," prefix — DomoAI wants raw base64 only.
  function b64(dataUrl) {
    if (!dataUrl) return null;
    const idx = dataUrl.indexOf(",");
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  }

  const category = model.domoAICategory;
  let endpoint;
  const body = {};

  if (category === "image2video") {
    endpoint = "/v1/video/image2video";
    const imageData = inputs.image || inputs.images?.[0];
    if (!imageData) throw new Error("DomoAI image2video requires an image input");
    body.model = model.domoAIModel;
    body.prompt = inputs.prompt || "";
    body.image = { bytes_base64_encoded: b64(imageData) };
    body.seconds = Math.min(10, Math.max(1, inputs.duration ?? model.durations?.[0] ?? 5));

  } else if (category === "text2video") {
    endpoint = "/v1/video/text2video";
    body.model = model.domoAIModel;
    body.prompt = inputs.prompt || "";
    body.seconds = Math.min(10, Math.max(1, inputs.duration ?? model.durations?.[0] ?? 5));
    if (inputs.style) body.style = inputs.style;
    if (inputs.aspectRatio) body.aspect_ratio = inputs.aspectRatio;

  } else if (category === "talking-avatar") {
    endpoint = "/v1/video/talking-avatar";
    const faceData = inputs.face || inputs.image;
    const audioData = inputs.audio;
    if (!audioData) throw new Error("DomoAI talking-avatar requires an audio input");
    body.model = model.domoAIModel || "talking-avatar-v1";
    body.prompt = inputs.prompt || "";
    if (faceData) body.image = { bytes_base64_encoded: b64(faceData) };
    body.audio = { bytes_base64_encoded: b64(audioData) };
    body.seconds = Math.min(60, Math.max(1, inputs.durationSeconds ?? 5));

  } else {
    throw new Error(`Unknown DomoAI category: ${category}`);
  }

  // Submit
  const submitRes = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => "");
    throw new Error(`DomoAI submit error (${submitRes.status}): ${errText || submitRes.statusText}`);
  }

  const submitJson = await submitRes.json();
  const taskId = submitJson?.data?.task_id;
  if (!taskId) throw new Error("DomoAI did not return a task_id");

  // Poll up to 10 minutes (120 × 5s)
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(`${BASE}/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) continue; // transient error — keep polling

    const pollJson = await pollRes.json();
    const status = pollJson?.data?.status;

    if (status === "SUCCESS") {
      const url = pollJson.data.output_videos?.[0]?.url;
      if (!url) throw new Error("DomoAI task succeeded but returned no output URL");
      return url;
    }

    if (status === "FAILED" || status === "CANCELED") {
      throw new Error(`DomoAI task ${status} (id: ${taskId})`);
    }
    // PENDING | QUEUING | PROCESSING — keep waiting
  }

  throw new Error("DomoAI task timed out after 10 minutes");
}

// model: the full model object from models/index.js (needs .id and .provider)
export async function runModel(model, inputs) {
  if (model.provider === "replicate") {
    return runReplicate(model, inputs);
  }

  if (model.provider === "cloudflare") {
    return runCloudflare(model, inputs);
  }

  if (model.provider === "huggingface") {
    return runHuggingFace(model, inputs);
  }

  if (model.provider === "wavespeed") {
    return runWaveSpeed(model.id, inputs);
  }

  if (model.provider === "atlascloud") {
    return runAtlasCloud(model, inputs);
  }

  if (model.provider === "domoai") {
    return runDomoAI(model, inputs);
  }

  throw new Error(`Unknown provider: ${model.provider}`);
}

export { replicate };
