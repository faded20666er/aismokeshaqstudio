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
    const audioBlob = await hf.textToSpeech({
      model: modelId,
      inputs: inputs.text || inputs.prompt,
    });

    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audioBlob.type || "audio/wav";

    return `data:${mimeType};base64,${base64}`;
  }

  // image and video (image-to-video) NSFW models both go through
  // textToImage / similar image pipelines on HuggingFace's side.
  const imageBlob = await hf.textToImage({
    model: modelId,
    inputs: inputs.prompt,
  });

  const arrayBuffer = await imageBlob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = imageBlob.type || "image/png";

  return `data:${mimeType};base64,${base64}`;
}

async function runReplicate(modelId, inputs) {
  return replicate.run(modelId, { input: inputs });
}

// model: the full model object from models/index.js (needs .id and .provider)
export async function runModel(model, inputs) {
  if (model.provider === "replicate") {
    return runReplicate(model.id, inputs);
  }

  if (model.provider === "huggingface") {
    return runHuggingFace(model, inputs);
  }

  throw new Error(`Unknown provider: ${model.provider}`);
}

export { replicate };
