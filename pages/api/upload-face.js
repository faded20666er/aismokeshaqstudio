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

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    if (!filename) {
      return res.status(400).json({ error: "Missing filename query param" });
    }

    const fileBuffer = await getRawBody(req);

    if (!fileBuffer.length) {
      return res.status(400).json({ error: "Empty file" });
    }

    if (fileBuffer.length > 4.5 * 1024 * 1024) {
      return res.status(413).json({
        error: "File too large for server upload (max 4.5MB). Use a smaller image.",
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
