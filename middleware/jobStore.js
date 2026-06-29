// middleware/jobStore.js
//
// Tracks the status of long-running generation jobs in Redis. This
// exists because Vercel Hobby plan functions have a hard duration
// ceiling (officially 300s with Fluid Compute, but some real-world
// reports show stricter 60s enforcement depending on configuration —
// either way, nowhere near enough for a 10-minute video generation
// that polls a slow provider).
//
// Architecture: a submit endpoint (e.g. /api/generate) creates a job
// record here, kicks off the real provider call via waitUntil (so it
// keeps running briefly after the response is sent), and returns
// {jobId} immediately. The BROWSER then polls /api/job-status?jobId=
// until the job's status flips to "completed" or "failed". If the
// background work can't finish within the function's own lifetime,
// the job is simply left "processing" in Redis — the next poll just
// sees it's still going, no crash, no lost state.
//
// This does NOT make the underlying provider call any faster — a
// genuinely 10-minute video generation still takes 10 minutes. What
// this fixes is the FAILURE MODE: instead of the whole request dying
// with no trace when Vercel kills the function mid-poll, the job
// record persists in Redis and a separate mechanism (see
// utils/runModelAsync.js) keeps nudging it forward.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const JOB_KEY = (jobId) => `job:${jobId}`;
const JOB_TTL_SECONDS = 60 * 60; // jobs expire from Redis after 1 hour

export async function createJob(jobId, initialData = {}) {
  const job = {
    status: "processing",
    output: null,
    error: null,
    createdAt: Date.now(),
    ...initialData,
  };
  await redis.set(JOB_KEY(jobId), JSON.stringify(job), { ex: JOB_TTL_SECONDS });
  return job;
}

export async function getJob(jobId) {
  const raw = await redis.get(JOB_KEY(jobId));
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function updateJob(jobId, updates) {
  const existing = await getJob(jobId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await redis.set(JOB_KEY(jobId), JSON.stringify(updated), { ex: JOB_TTL_SECONDS });
  return updated;
}

export function generateJobId() {
  return crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
