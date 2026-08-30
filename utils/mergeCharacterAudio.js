// utils/mergeCharacterAudio.js
//
// Merges one character's dialogue-block audio clips (each already
// resolved to a real URL — TTS-generated or user-uploaded) into ONE
// audio track, with each clip placed at its own real startTime and
// silence everywhere else.
//
// WHY THIS EXISTS [Aug 30 2026]: pages/api/timeline-generate.js used
// to only ever resolve a character's FIRST dialogue block and hand
// that single short clip straight to WaveSpeed. Every later line on
// that character's row in the Timeline was silently dropped. A real
// customer hit exactly this: a 15-second timeline produced a 2-3
// second clip containing only the first line's audio, because that's
// literally all that was ever sent. WaveSpeed's InfiniteTalk models
// (solo and multi) take exactly ONE audio file per speaker — there is
// no "list of timed clips" input on their side — so building one
// correctly-timed track ourselves, here, is the only way to actually
// honor what DialogueTimeline.jsx already promises ("Gaps are
// supported: startTime is independently editable").
//
// APPROACH: download each clip to /tmp, then run one ffmpeg pass that
// delays each input stream to its own startTime (the `adelay` filter)
// and mixes all of them into a single output (`amix`) — this naturally
// produces a track exactly as long as (latest block's start + its own
// real length), without this code ever needing to know any clip's
// duration up front; ffmpeg reads that from the files itself. Uses
// ffmpeg-static (a bundled binary, no system ffmpeg required) driven
// directly via child_process — NOT the popular `fluent-ffmpeg` wrapper,
// which is deprecated/unsupported upstream.

import { spawn } from "node:child_process";
import { writeFile, readFile, unlink, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { put } from "@vercel/blob";

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not fetch dialogue audio clip: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buffer);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", (err) => reject(new Error(`Could not start ffmpeg: ${err.message}`)));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      // Keep only the tail of ffmpeg's (often very verbose) stderr —
      // the real error is always at the end.
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-1500)}`));
    });
  });
}

// clips: [{ url, startTimeMs }] — does not need to be pre-sorted.
// Returns a public URL to the merged mp3, or the original single URL
// unchanged if there's nothing to actually merge (the common case: one
// line, starting at the very beginning of the clip).
export async function mergeCharacterAudio(clips) {
  if (!clips || clips.length === 0) return null;

  if (clips.length === 1 && clips[0].startTimeMs === 0) {
    return clips[0].url;
  }

  const dir = await mkdtemp(path.join(tmpdir(), "timeline-audio-"));

  try {
    const inputPaths = await Promise.all(
      clips.map(async (clip, i) => {
        const p = path.join(dir, `in${i}.mp3`);
        await downloadToFile(clip.url, p);
        return p;
      })
    );

    // `all=1` applies the same delay to every channel regardless of
    // whether a given clip is mono or stereo — avoids adelay's
    // per-channel-count footgun when clips come from different
    // sources (ElevenLabs vs. a user's uploaded file). `normalize=0`
    // on amix stops ffmpeg from quietly turning down every clip's
    // volume just because there are multiple inputs — since these
    // clips don't overlap in time (each speaks in its own window),
    // there's no reason to reduce loudness the way amix's default
    // (built for genuinely simultaneous sources) would.
    const delayLabels = clips.map((clip, i) => {
      const delayMs = Math.max(0, Math.round(clip.startTimeMs));
      return `[${i}:a]adelay=${delayMs}:all=1[a${i}]`;
    });
    const mixInputs = clips.map((_, i) => `[a${i}]`).join("");
    const filterComplex = `${delayLabels.join("; ")}; ${mixInputs}amix=inputs=${clips.length}:duration=longest:dropout_transition=0:normalize=0[mixed]`;

    const outPath = path.join(dir, "out.mp3");
    await runFfmpeg([
      "-y",
      ...inputPaths.flatMap((p) => ["-i", p]),
      "-filter_complex",
      filterComplex,
      "-map",
      "[mixed]",
      "-acodec",
      "libmp3lame",
      "-b:a",
      "128k",
      outPath,
    ]);

    const outBuffer = await readFile(outPath);
    const blob = await put(`timeline-audio/${Date.now()}-merged.mp3`, outBuffer, {
      access: "public",
      contentType: "audio/mpeg",
    });

    return blob.url;
  } finally {
    // Best-effort cleanup of the temp directory — /tmp is ephemeral
    // per invocation anyway, but no reason to hold onto it once done.
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
