// utils/runModelAsync.js
//
// Bridges the gap between "real generation can take up to 10 minutes"
// and "this function gets killed after ~60s on Hobby." The submit
// endpoint creates a job record, then calls startJobInBackground,
// which uses waitUntil to keep the actual provider call running
// briefly after the response has already been sent to the browser.
// The browser polls /api/job-status separately and never waits on
// this function directly.
//
// HONEST LIMITATION: waitUntil extends how long work can run AFTER
// the response is sent, but the function's overall invocation still
// has a hard ceiling (Hobby: officially up to 300s with Fluid Compute,
// though some real-world reports show stricter enforcement around
// 60s depending on configuration). For jobs that genuinely take
// longer than that ceiling — multi-minute video generations — this
// does NOT make them complete faster. What it DOES fix: instead of
// the whole request dying with no trace and the user seeing a
// generic, confusing failure, the job record persists in Redis with
// a clear status, and the user gets an honest "still processing" or
// "failed: <real reason>" message instead of silence. A full
// multi-invocation continuation chain (resuming a job across several
// separate function calls until it finishes) would close this gap
// completely but is a further iteration, not implemented here yet —
// flagged honestly rather than silently assumed solved.

import { waitUntil } from "@vercel/functions";
import { updateJob } from "../middleware/jobStore.js";
import { runModel } from "./runModel.js";
import { deductCredits } from "../middleware/creditsStore.js";
import { recordGeneration } from "../middleware/historyStore.js";

export async function processJob(jobId, model, inputs, meta) {
  try {
    // meta.customRunner lets callers with non-standard generation
    // shapes (e.g. voice.js's direct ElevenLabs call, which takes
    // (voiceId, text, apiKey) rather than the standard
    // runModel(model, inputs) shape) still use this same async job
    // infrastructure instead of being forced through runModel.
    const output = meta.customRunner
      ? await meta.customRunner()
      : await runModel(model, inputs);
    const finalOutput = Array.isArray(output) ? output[0] : output;

    const remaining = meta.creditsToCharge
      ? await deductCredits(meta.userId, meta.creditsToCharge)
      : undefined;

    if (meta.recordHistory) {
      await recordGeneration(meta.userId, {
        category: meta.category,
        modelId: model.id,
        modelName: model.name,
        output: finalOutput,
        creditsUsed: meta.creditsToCharge || 0,
        prompt: meta.prompt,
      });
    }

    await updateJob(jobId, {
      status: "completed",
      output: finalOutput,
      creditsRemaining: remaining,
    });
  } catch (err) {
    console.error(`runModelAsync job ${jobId} failed:`, err.message);
    await updateJob(jobId, {
      status: "failed",
      error: err.message,
    });
  }
}

// Call from a submit endpoint AFTER creating the job record via
// createJob() and BEFORE responding to the client with {jobId}.
export function startJobInBackground(jobId, model, inputs, meta) {
  waitUntil(processJob(jobId, model, inputs, meta));
}
