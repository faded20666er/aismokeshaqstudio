// pages/api/upload-face.js
//
// Uploads a character face image to Vercel Blob storage and returns a
// public URL. Needed because Replicate (and HuggingFace) models need a
// fetchable URL for input images — a browser-local object URL
// (URL.createObjectURL) only works inside that one browser tab and
// can't be reached by Replicate's servers.
//
// Server uploads only work for files under 4.5MB on Vercel — fine for
// face photos, but if this ever needs to support uploaded VIDEO frames
// as character faces, large files should switch to Vercel Blob client
// uploads instead (see Vercel Blob client-upload docs).

import { put } from "@vercel/blob";
import { verifyUserId } from "../../middleware/verifyUserId.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

// SECURITY FIX [Sep 4 2026]: an outside security review flagged this
// endpoint as reachable with zero identity attached and zero content-
// type restriction — anyone could dump arbitrary files (any type, up
// to 4.5MB, repeatedly) into this site's paid Blob storage. Its only
// live caller today is DialogueTimeline.jsx's audio-clip upload, so the
// allowlist below is audio-focused; add a type here (with a real
// reason in a comment) before any new caller needs something else,
// rather than opening this back up wholesale.
const ALLOWED_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const filename = req.query.filename;
    const userId = req.query.userId;

    if (!filename) {
      return res.status(400).json({ error: "Missing filename query param" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId query param" });
    }

    const auth = verifyUserId(req, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const contentType = req.headers["content-type"];
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType.split(";")[0].trim())) {
      return res.status(415).json({ error: "Unsupported file type" });
    }

    const fileBuffer = await getRawBody(req);

    if (!fileBuffer.length) {
      return res.status(400).json({ error: "Empty file" });
    }

    if (fileBuffer.length > 4.5 * 1024 * 1024) {
      return res.status(413).json({
        error: "File too large for server upload (max 4.5MB). Use a smaller file.",
      });
    }

    const blob = await put(filename, fileBuffer, {
      access: "public",
      addRandomSuffix: true,
    });

    return res.status(200).json({
      success: true,
      url: blob.url,
    });
  } catch (err) {
    console.error("upload-face.js error:", err);
    return res.status(500).json({
      error: "Upload failed",
      details: err.message,
    });
  }
}
