// pages/api/job-status.js
//
// Polled by the browser every few seconds after a generation endpoint
// (generate.js, lipsync.js, voice.js, timeline-generate.js) returns a
// {jobId} instead of waiting inline for the full result. See
// middleware/jobStore.js for the architecture this supports.
//
// RESTRUCTURED [Sep 4 2026]: for Multi-Character Timeline jobs
// specifically, this is now also the thing that actually DRIVES the
// generation forward — one quick step per poll — instead of one
// background invocation blocking through every pass. See
// utils/timelinePipeline.js for why: a real customer's 4-character
// timeline got killed by Vercel's 300-second function ceiling because
// the old code polled WaveSpeed in a tight loop for up to 10 minutes
// inside a single continuous invocation. Real AI video platforms never
// do that (confirmed against Replicate's/fal.ai's/HeyGen's own docs) —
// they submit, then let a separate fast check-in nudge things forward.
// This poll IS that check-in: on each call, if a timeline job is mid-
// pipeline, it makes ONE quick WaveSpeed status check, and if that step
// just finished, submits the next one — never blocking, never looping.

import { getJob, updateJob } from "../../middleware/jobStore.js";
import { pollWaveSpeedOnce, submitWaveSpeed } from "../../utils/runModel.js";
import { buildStepInputs, resolveStepModel } from "../../utils/timelinePipeline.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { recordGeneration } from "../../middleware/historyStore.js";

// Advances a Timeline job by exactly one WaveSpeed check-in. Never
// loops, never waits beyond one fetch — safe to call from inside a
// request handler on every poll, on any Vercel plan.
async function advanceTimelinePipeline(jobId, job) {
  const { pipeline } = job;

  if (!pipeline.pendingRequestId) {
    // Nothing in flight (shouldn't normally happen — timeline-generate.js
    // submits step 1 before ever returning — but recover cleanly if it
    // does, rather than leaving the job stuck forever with no path
    // forward): (re)submit the current step.
    try {
      const model = resolveStepModel(pipeline.steps[pipeline.currentStepIndex], pipeline.modelIds);
      const inputs = await buildStepInputs(pipeline.steps[pipeline.currentStepIndex], {
        scene: pipeline.scene,
        blocks: pipeline.blocks,
        userId: job.userId,
        currentVideoUrl: pipeline.currentVideoUrl,
      });
      const requestId = await submitWaveSpeed(model, inputs);
      return updateJob(jobId, { pipeline: { ...pipeline, pendingRequestId: requestId } });
    } catch (err) {
      return updateJob(jobId, { status: "failed", error: err.message });
    }
  }

  const result = await pollWaveSpeedOnce(pipeline.pendingRequestId);

  if (result.status === "processing") {
    return job; // no change — frontend just sees "still processing" again
  }

  if (result.status === "failed") {
    return updateJob(jobId, { status: "failed", error: result.error || "Generation failed" });
  }

  // This step just completed.
  const stepOutput = Array.isArray(result.output) ? result.output[0] : result.output;
  const nextIndex = pipeline.currentStepIndex + 1;

  if (nextIndex >= pipeline.steps.length) {
    // That was the last pass — finalize exactly like the old
    // processJob() did for every other generation type: deduct
    // credits, record history, mark completed.
    const remaining = job.creditsToCharge ? await deductCredits(job.userId, job.creditsToCharge) : undefined;

    try {
      await recordGeneration(job.userId, {
        category: job.category,
        modelId: job.modelId,
        modelName: job.modelName,
        output: stepOutput,
        creditsUsed: job.creditsToCharge || 0,
        prompt: job.prompt,
      });
    } catch (err) {
      // History is a nice-to-have — never let a logging failure turn a
      // successfully-finished video into a "failed" job for the user.
      console.error(`job-status.js: recordGeneration failed for ${jobId}:`, err.message);
    }

    return updateJob(jobId, {
      status: "completed",
      output: stepOutput,
      creditsRemaining: remaining,
      pipeline: { ...pipeline, currentVideoUrl: stepOutput, currentStepIndex: nextIndex, pendingRequestId: null },
    });
  }

  // More passes to go — submit the next one now (still fast: audio/mask
  // prep + one WaveSpeed submit call).
  try {
    const nextModel = resolveStepModel(pipeline.steps[nextIndex], pipeline.modelIds);
    const nextInputs = await buildStepInputs(pipeline.steps[nextIndex], {
      scene: pipeline.scene,
      blocks: pipeline.blocks,
      userId: job.userId,
      currentVideoUrl: stepOutput,
    });
    const nextRequestId = await submitWaveSpeed(nextModel, nextInputs);

    return updateJob(jobId, {
      pipeline: {
        ...pipeline,
        currentStepIndex: nextIndex,
        currentVideoUrl: stepOutput,
        pendingRequestId: nextRequestId,
      },
    });
  } catch (err) {
    return updateJob(jobId, { status: "failed", error: err.message });
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId" });
    }

    let job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found or expired" });
    }

    if (job.status === "processing" && job.pipeline?.kind === "timeline") {
      try {
        job = (await advanceTimelinePipeline(jobId, job)) || job;
      } catch (err) {
        console.error(`job-status.js: pipeline advance failed for ${jobId}:`, err.message);
        job = (await updateJob(jobId, { status: "failed", error: err.message })) || job;
      }
    }

    return res.status(200).json(job);
  } catch (err) {
    console.error("job-status.js error:", err);
    return res.status(500).json({
      error: "Failed to check job status",
      details: err.message,
    });
  }
}
