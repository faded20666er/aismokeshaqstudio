// utils/pollJob.js
//
// Client-side helper: given a jobId returned by a submit endpoint
// (generate.js, lipsync.js, voice.js, timeline-generate.js), polls
// /api/job-status until the job completes or fails. Used by every
// page's generation flow now that those endpoints return {jobId}
// immediately instead of waiting inline for the full result.

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MINUTES = 12; // a bit longer than the longest real job we expect, so this doesn't give up before a genuinely slow video finishes

export async function pollJob(jobId, { onProgress } = {}) {
  const maxAttempts = Math.ceil((MAX_POLL_MINUTES * 60 * 1000) / POLL_INTERVAL_MS);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`/api/job-status?jobId=${encodeURIComponent(jobId)}`);
    const job = await res.json();

    if (!res.ok) {
      throw new Error(job.error || "Could not check generation status");
    }

    if (onProgress) onProgress(job);

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(job.error || "Generation failed");
    }

    // still "processing" — wait, then poll again
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    "This is taking longer than expected. Check your history page in a few minutes — it may still complete."
  );
}
