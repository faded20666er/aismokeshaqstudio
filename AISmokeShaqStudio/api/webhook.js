// AISmokeShaqStudio/api/webhook.js

import Replicate from "replicate";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Replicate sends the prediction payload in req.body
    const event = req.body;

    if (!event || !event.id) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    const {
      id,
      status,
      output,
      logs,
      error,
      metrics,
      created_at,
      completed_at,
    } = event;

    // ---------------------------------------------------------
    // OPTIONAL: Save job status to your database
    // (Redis, MongoDB, Supabase, etc.)
    //
    // Example:
    // await saveJobStatus(id, { status, output, error });
    //
    // Leaving this commented because you may choose your own DB.
    // ---------------------------------------------------------

    console.log("Webhook received for job:", id, "status:", status);

    // ---------------------------------------------------------
    // Respond immediately so Replicate knows we received it
    // ---------------------------------------------------------
    return res.status(200).json({
      received: true,
      jobId: id,
      status,
    });
  } catch (err) {
    console.error("webhook.js error:", err);
    return res.status(500).json({
      error: "Webhook processing failed",
      details: err.message,
    });
  }
}
