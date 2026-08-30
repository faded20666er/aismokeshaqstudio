// utils/generateMask.js
//
// Builds a mask image for InfiniteTalk's video-to-video `mask_image`
// parameter: a black image with a white rectangle (or several) over
// the region(s) that should be allowed to move/animate. Used by the
// Multi-Character Timeline when layering additional characters' lip
// sync onto a video that already has earlier characters synced (via
// infinitetalk/multi or infinitetalk/multi/video-to-video-multi) — the
// mask protects their already-correct faces from being re-touched.
//
// GENERALIZED [Aug 30 2026]: the Timeline used to hard-stop at exactly
// 3 characters (2 synced natively in pass 1, a single 3rd character
// layered via a masked SOLO pass in pass 2). It now groups characters
// into PAIRS and chains one masked DUAL pass per remaining pair —
// confirmed real and supported: WaveSpeed's own docs for
// infinitetalk/video-to-video-multi
// (https://wavespeed.ai/docs/docs-api/wavespeed-ai/infinitetalk-video-to-video-multi)
// list mask_image as a real, optional parameter alongside
// left_audio/right_audio, not just on the solo video-to-video
// endpoint. generateMaskFromBoxes() below builds ONE mask covering
// every character in a pair (or just one box, for an odd leftover
// character) — see pages/api/timeline-generate.js for the pass loop
// that uses this.
//
// CONVENTION NOTE: WaveSpeed's docs describe mask_image as controlling
// "which regions can move" and explicitly warn against uploading the
// full image as the mask (result renders fully black if you do), but
// do not document the white/black polarity explicitly. This follows
// the standard convention used by nearly every comparable
// inpainting/masking API (white = editable/active region, black =
// protected/frozen region). VERIFY WITH ONE REAL TEST RUN before
// relying on this for production — if polarity is backwards, flip
// WHITE_RGB and BLACK_RGB below.

import sharp from "sharp";
import { put } from "@vercel/blob";

const WHITE_RGB = { r: 255, g: 255, b: 255 };
const BLACK_RGB = { r: 0, g: 0, b: 0 };

// box: { left, top, width, height } as PERCENTAGES (0-100) of the
// source image — exactly what CharacterTagger.jsx produces. width/
// height here are the real pixel dimensions of the source scene image.
//
// Pads each box slightly (15% of its own size) so the mask comfortably
// covers the full head/jaw, not just the tight box the user drew —
// mouths and jaws move outside a tightly-cropped face box during
// speech, and a too-tight mask risks clipping the animated region.
function paddedRectFor(box, width, height) {
  const left = Math.round((box.left / 100) * width);
  const top = Math.round((box.top / 100) * height);
  const boxWidth = Math.max(1, Math.round((box.width / 100) * width));
  const boxHeight = Math.max(1, Math.round((box.height / 100) * height));

  const padX = Math.round(boxWidth * 0.15);
  const padY = Math.round(boxHeight * 0.15);

  const paddedLeft = Math.max(0, left - padX);
  const paddedTop = Math.max(0, top - padY);
  const paddedWidth = Math.min(width - paddedLeft, boxWidth + padX * 2);
  const paddedHeight = Math.min(height - paddedTop, boxHeight + padY * 2);

  return { left: paddedLeft, top: paddedTop, width: paddedWidth, height: paddedHeight };
}

// Builds ONE mask covering every box in `boxes` — used to layer a
// PAIR of characters onto a video in a single masked dual pass (see
// timeline-generate.js). A single-box array works exactly like the
// old generateMaskFromBox() did (kept below as a thin wrapper for
// the odd-leftover-character case, which is still just one box).
export async function generateMaskFromBoxes(boxes, width, height) {
  const rects = boxes.map((box) => paddedRectFor(box, width, height));

  const blackBackground = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: BLACK_RGB,
    },
  });

  const whiteRects = await Promise.all(
    rects.map((rect) =>
      sharp({
        create: {
          width: rect.width,
          height: rect.height,
          channels: 3,
          background: WHITE_RGB,
        },
      })
        .png()
        .toBuffer()
    )
  );

  const maskBuffer = await blackBackground
    .composite(whiteRects.map((input, i) => ({ input, left: rects[i].left, top: rects[i].top })))
    .png()
    .toBuffer();

  const blob = await put(`timeline-masks/${Date.now()}-mask.png`, maskBuffer, {
    access: "public",
    contentType: "image/png",
  });

  return blob.url;
}

// Single-box convenience wrapper — kept for callers layering exactly
// one leftover character (an odd character out at the end of the
// pairing loop).
export async function generateMaskFromBox(box, width, height) {
  return generateMaskFromBoxes([box], width, height);
}

// Reads real pixel dimensions of an image given its URL — needed
// because CharacterTagger's boxes are stored as percentages, and the
// mask needs to be generated at the source image's actual resolution.
export async function getImageDimensions(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Could not fetch scene image for mask generation: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const metadata = await sharp(buffer).metadata();
  return { width: metadata.width, height: metadata.height };
}
