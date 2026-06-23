// pages/api/status.js
//
// Polls Replicate for the status of a long-running prediction (used for
// video/lipsync jobs that don't finish instantly). Moved here from the
// dead /api folder.

import { replicate } from "../../utils/runModel.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { jobId } = req.body || {};

    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId" });
    }

    const job = await replicate.predictions.get(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.status(200).json({
      id: job.id,
      status: job.status,
      output: job.output || null,
      logs: job.logs || null,
      error: job.error || null,
      metrics: job.metrics || null,
    });
  } catch (err) {
    console.error("status.js error:", err);
    return res.status(500).json({
      error: "Failed to fetch job status",
      details: err.message,
    });
  }
}
