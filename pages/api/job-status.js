// pages/api/job-status.js
//
// Polled by the browser every few seconds after a generation endpoint
// (generate.js, lipsync.js, voice.js, timeline-generate.js) returns a
// {jobId} instead of waiting inline for the full result. See
// middleware/jobStore.js for the architecture this supports.

import { getJob } from "../../middleware/jobStore.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId" });
    }

    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found or expired" });
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
