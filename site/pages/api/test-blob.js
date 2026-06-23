// pages/api/test-blob.js
//
// TEMPORARY diagnostic endpoint — not part of the app, just isolates
// whether Blob writes work at all right now, independent of any other
// logic (credit checks, model lookups, base64 parsing, etc). Visit
// /api/test-blob directly in your browser (GET request) to run it.
// Delete this file once the Blob issue is resolved.

import { put } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    const blob = await put("blob-diagnostic-test.txt", "hello world", {
      access: "public",
      addRandomSuffix: true,
    });

    return res.status(200).json({
      success: true,
      message: "Blob write succeeded",
      url: blob.url,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      // Show (masked) whether the token env var is even present at all,
      // without leaking the actual secret value.
      tokenPresent: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenLength: process.env.BLOB_READ_WRITE_TOKEN
        ? process.env.BLOB_READ_WRITE_TOKEN.length
        : 0,
      tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN
        ? process.env.BLOB_READ_WRITE_TOKEN.slice(0, 20)
        : null,
    });
  }
}
