// pages/timeline.jsx
//
// The Multi-Character Timeline: upload ONE shared scene (photo or
// video), draw bounding boxes to tag up to 3 characters in it, build a
// shared dialogue timeline (audio upload or TTS per line, gaps
// allowed), set the total clip length, then generate one scene video.
//
// Real architecture (no model anywhere supports more than 2
// simultaneous speakers per call — verified against WaveSpeed's live
// API docs): 1-2 characters = one infinitetalk/multi call. A 3rd
// character is layered on top via a second, masked video-to-video
// pass that only animates that character's tagged face region,
// protecting characters 1 & 2's already-synced faces. See
// pages/api/timeline-generate.js for the full generation logic and
// research notes.

import { useState, useMemo } from "react";
import SceneUpload from "../components/SceneUpload";
import CharacterTagger from "../components/CharacterTagger";
import DialogueTimeline from "../components/DialogueTimeline";
import { useAppUserId } from "../utils/useAppUserId";
import { findModelById } from "../models/index.js";
import { pollJob } from "../utils/pollJob";

const MAX_CLIP_SECONDS = 60;

export default function TimelinePage() {
  const [scene, setScene] = useState({ previewUrl: null, mediaType: null, url: null });
  const [characters, setCharacters] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [clipSeconds, setClipSeconds] = useState(15);
  const [resolution, setResolution] = useState("720p"); // "720p" | "480p"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [credits, setCredits] = useState(null);
  const { userId, isReady } = useAppUserId();

  const sceneReady = !!scene.url;
  const charactersReady = characters.length > 0;
  const canGenerate = sceneReady && charactersReady && blocks.length > 0 && !loading;

  function handleCharacterVoiceChange(characterId, voice) {
    setCharacters((prev) =>
      prev.map((c) => (c.id === characterId ? { ...c, voice } : c))
    );
  }

  // Live credit estimate — mirrors the backend's real charging logic
  // exactly (see pages/api/timeline-generate.js) so the number shown
  // here before generating is what actually gets charged.
  //   1 character  -> one solo-rate pass
  //   2 characters -> one multi-rate pass
  //   3 characters -> one multi-rate pass + one solo-rate layering pass
  const estimatedCredits = useMemo(() => {
    const multiModelId =
      resolution === "720p" ? "wavespeed-ai/infinitetalk-multi" : "wavespeed-ai/infinitetalk-multi-480p";
    const soloModelId =
      resolution === "720p" ? "wavespeed-ai/infinitetalk" : "wavespeed-ai/infinitetalk-480p";

    const multiModel = findModelById(multiModelId);
    const soloModel = findModelById(soloModelId);
    if (!multiModel || !soloModel) return null;

    const perSegment = (m) => Math.max(m.credits, Math.ceil(m.creditsPerSecond * clipSeconds));
    const multiCost = perSegment(multiModel);
    const soloCost = perSegment(soloModel);

    if (characters.length <= 1) return soloCost;
    if (characters.length === 2) return multiCost;
    return multiCost + soloCost; // 3rd character = extra masked layering pass
  }, [characters.length, clipSeconds, resolution]);

  const passCount = characters.length > 2 ? 2 : 1;

  async function handleGenerate() {
    try {
      if (!isReady || !userId) {
        throw new Error("Still loading your account — try again in a second.");
      }

      setLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch("/api/timeline-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          scene: { url: scene.url, mediaType: scene.mediaType },
          characters: characters.map((c) => ({
            id: c.id,
            name: c.name,
            box: c.box,
            voice: c.voice || null,
          })),
          blocks,
          clipSeconds,
          resolution,
          // No NSFW toggle on this page yet — every InfiniteTalk model
          // in the catalog is nsfw:false, so this is currently a no-op
          // on the backend. Sent explicitly so the field exists if an
          // NSFW-flagged model is ever added to this endpoint later.
          nsfwEnabled: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      const completedJob = await pollJob(data.jobId);

      setResult(completedJob);

      if (typeof completedJob.creditsRemaining === "number") {
        setCredits(completedJob.creditsRemaining);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="studio-root">
      <div className="studio-overlay" />
      <div className="studio-layout">
        <div className="panel-root timeline-page">
          <div className="panel-gold-bar" />
          <div className="panel-header">
            <h1>Multi-Character Timeline</h1>
            <p>Upload a scene, tag your characters, write the dialogue, generate one video.</p>
            <a href="/studio" className="panel-link">
              ← Back to Studio
            </a>
          </div>

          <div className="panel-row">
            <div className="panel-full">
              <SceneUpload scene={scene} onChange={setScene} />
            </div>
          </div>

          <div className="panel-row">
            <div className="panel-full">
              <CharacterTagger scene={scene} characters={characters} onChange={setCharacters} />
            </div>
          </div>

          <div className="panel-row">
            <div className="panel-full">
              <DialogueTimeline
                characters={characters}
                blocks={blocks}
                onChange={setBlocks}
                onCharacterVoiceChange={handleCharacterVoiceChange}
                userId={userId}
                clipSeconds={clipSeconds}
                onClipSecondsChange={setClipSeconds}
                maxClipSeconds={MAX_CLIP_SECONDS}
              />
            </div>
          </div>

          <div className="panel-row">
            <div className="panel-col">
              <label className="panel-label">Quality</label>
              <select
                className="panel-select"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                <option value="720p">720p (higher cost)</option>
                <option value="480p">480p (budget)</option>
              </select>
            </div>

            <div className="panel-col">
              <label className="panel-label">Estimated Cost</label>
              <p className="timeline-cost-estimate">
                {estimatedCredits !== null ? `${estimatedCredits} credits` : "—"}
                {characters.length > 2 && (
                  <span className="timeline-cost-note">
                    {" "}
                    ({passCount} passes — 2 characters + 1 layered)
                  </span>
                )}
              </p>
            </div>
          </div>

          {typeof credits === "number" && (
            <p className="panel-credits">Credits remaining: {credits}</p>
          )}

          <div className="panel-row panel-actions">
            <button
              className="panel-button"
              disabled={!canGenerate}
              onClick={handleGenerate}
              type="button"
            >
              {loading ? "Generating scene video…" : "Generate Video"}
            </button>
          </div>

          {!sceneReady && (
            <p className="timeline-hint">Upload a scene photo or video to get started.</p>
          )}

          {sceneReady && !charactersReady && (
            <p className="timeline-hint">Tag at least one character before generating.</p>
          )}

          {error && <div className="panel-error">{error}</div>}

          {result && result.output && (
            <div className="panel-output">
              <p>Final video:</p>
              <video src={result.output} controls style={{ maxWidth: "100%", borderRadius: 12 }} />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .timeline-cost-estimate {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #f3d98b;
        }

        .timeline-cost-note {
          font-size: 0.75rem;
          font-weight: 400;
          opacity: 0.7;
          color: #d9d9d9;
        }
      `}</style>
    </div>
  );
}
