// utils/generateMask.js
//
// Builds a mask image for InfiniteTalk's video-to-video `mask_image`
// parameter: a black image with a white rectangle over the region
// that should be allowed to move/animate. Used by the Multi-Character
// Timeline when layering a 3rd character's lip sync onto a video that
// already has characters 1 & 2 synced (via infinitetalk/multi) — the
// mask protects their already-correct faces from being re-touched.
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
export async function generateMaskFromBox(box, width, height) {
  const left = Math.round((box.left / 100) * width);
  const top = Math.round((box.top / 100) * height);
  const boxWidth = Math.max(1, Math.round((box.width / 100) * width));
  const boxHeight = Math.max(1, Math.round((box.height / 100) * height));

  // Pad the box slightly (10% of its own size) so the mask comfortably
  // covers the full head/jaw, not just the tight box the user drew —
  // mouths and jaws move outside a tightly-cropped face box during
  // speech, and a too-tight mask risks clipping the animated region.
  const padX = Math.round(boxWidth * 0.15);
  const padY = Math.round(boxHeight * 0.15);

  const paddedLeft = Math.max(0, left - padX);
  const paddedTop = Math.max(0, top - padY);
  const paddedWidth = Math.min(width - paddedLeft, boxWidth + padX * 2);
  const paddedHeight = Math.min(height - paddedTop, boxHeight + padY * 2);

  const blackBackground = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: BLACK_RGB,
    },
  });

  const whiteRect = await sharp({
    create: {
      width: paddedWidth,
      height: paddedHeight,
      channels: 3,
      background: WHITE_RGB,
    },
  })
    .png()
    .toBuffer();

  const maskBuffer = await blackBackground
    .composite([{ input: whiteRect, left: paddedLeft, top: paddedTop }])
    .png()
    .toBuffer();

  const blob = await put(`timeline-masks/${Date.now()}-mask.png`, maskBuffer, {
    access: "public",
    contentType: "image/png",
  });

  return blob.url;
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
