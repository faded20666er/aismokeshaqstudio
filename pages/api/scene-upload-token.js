// pages/api/scene-upload-token.js
//
// Issues a short-lived client-upload token for Vercel Blob. Used by the
// Multi-Character Timeline's scene upload (photo OR video) so large
// video files can go straight from the browser to Blob storage,
// bypassing the 4.5MB body-size limit that applies to data sent through
// a serverless function (like /api/upload-face).
//
// Flow: browser calls @vercel/blob/client's `upload()` helper, which
// first POSTs here to get permission + a signed token, then uploads
// the file bytes directly to Blob, then (optionally) we get notified
// here again once the upload completes via onUploadCompleted.

import { handleUpload } from "@vercel/blob/client";
import { verifyUserId } from "../../middleware/verifyUserId.js";

export default async function handler(req, res) {
  try {
    const body = req.body;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // SECURITY FIX [Sep 4 2026]: this used to hand out an upload
        // token to ANYONE who could reach this endpoint directly — no
        // sign-in was actually required server-side, "sign-in required
        // to reach the Timeline UI" was only ever a client-side gate,
        // and at up to 500MB per request that's a real storage-cost/
        // abuse surface (an outside security review flagged this — see
        // components/SceneUpload.jsx for the clientPayload this reads).
        // Requires SOME identity (a real signed-in account OR an
        // anonymous guest id — this endpoint intentionally still
        // supports guests, same as the generation endpoints), and if it
        // claims to be a real account, verifies that against the actual
        // Clerk session rather than trusting the claim.
        let payload;
        try {
          payload = clientPayload ? JSON.parse(clientPayload) : {};
        } catch {
          payload = {};
        }

        if (!payload.userId) {
          throw new Error("Missing userId");
        }

        const auth = verifyUserId(req, payload.userId);
        if (!auth.ok) {
          throw new Error(auth.error);
        }

        // Restrict allowed file types to scene photos/videos only.
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "video/quicktime",
            "video/webm",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB ceiling
          tokenPayload: JSON.stringify({ clientPayload }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // No DB write needed — the frontend already has the blob URL
        // from the client-side upload() call's return value. This hook
        // exists mainly for logging/future hooks (e.g. virus scanning).
        console.log("scene-upload-token.js: upload completed:", blob.url);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error("scene-upload-token.js error:", err);
    return res.status(400).json({
      error: "Could not authorize upload",
      details: err.message,
    });
  }
}
