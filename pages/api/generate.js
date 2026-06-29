// pages/api/generate.js
//
// Main image/video generation endpoint. Submits the job and returns
// {jobId} IMMEDIATELY rather than waiting inline for the full result
// — the actual provider call runs in the background via waitUntil,
// and the browser polls /api/job-status until it's done.
//
// WHY: Vercel functions have a hard duration ceiling (Hobby plan:
// officially up to 300s with Fluid Compute, though some real-world
// configurations enforce a stricter 60s). Several video models take
// much longer than that to generate, and the OLD inline-await pattern
// meant the function got killed mid-generation with no clean error —
// exactly the "generation failed, nothing in the logs" bug reported
// for NSFW video models. This fix doesn't make slow models faster,
// but it stops the function's own lifetime from being the reason a
// real generation silently dies.

import { put } from "@vercel/blob";
import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { createJob, generateJobId } from "../../middleware/jobStore.js";
import { startJobInBackground } from "../../utils/runModelAsync.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

// Safe under both possible readings of Hobby's duration limit found
// during research (300s official w/ Fluid Compute vs ~60s reported in
// some real-world configurations) — this endpoint itself only needs
// to upload the reference image and kick off the background job, not
// wait for the full generation.
export const maxDuration = 60;

async function uploadFileInput(file, prefix) {
  if (!file) return null;
  const matches = file.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return file; // already a URL

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

    if (!model || (model.category !== "image" && model.category !== "video")) {
      return res.status(404).json({ error: "Model not found" });
    }

    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    const hasCredits = await checkCredits(userId, model.credits);
    if (!hasCredits) {
      return res.status(402).json({ error: "Not enough credits" });
    }

    // Upload any reference image(s) to Blob BEFORE returning — this
    // part is fast and the job needs the real URL, not a data: URI,
    // to hand off to the background worker.
    if (inputs?.images && Array.isArray(inputs.images)) {
      inputs.images = await Promise.all(
        inputs.images.map((img) => uploadFileInput(img, "generate-ref"))
      );
      inputs.image = inputs.images[0];
    } else if (inputs?.image) {
      inputs.image = await uploadFileInput(inputs.image, "generate-ref");
    }

    const jobId = generateJobId();
    await createJob(jobId, { modelId: model.id });

    startJobInBackground(jobId, model, inputs, {
      userId,
      creditsToCharge: model.credits,
      recordHistory: true,
      category: model.nsfw ? "image-nsfw" : "image",
      prompt: inputs?.prompt,
    });

    return res.status(202).json({
      success: true,
      jobId,
      model: model.id,
    });
  } catch (err) {
    console.error("generate.js error:", err);
    return res.status(500).json({
      error: "Failed to start generation",
      details: err.message,
    });
  }
}
