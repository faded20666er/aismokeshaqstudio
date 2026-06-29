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

export default async function handler(req, res) {
  try {
    const body = req.body;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // No auth gate here beyond what the rest of the app already
        // does client-side (sign-in required to reach the Timeline UI).
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
