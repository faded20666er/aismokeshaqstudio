// pages/timeline.jsx
//
// The 5-character timeline feature: set up character faces/names,
// build a shared dialogue timeline assigning lines to characters, then
// generate one merged video (TTS + lipsync per line, stitched together
// with lucataco/video-merge).

import { useState } from "react";
import CharacterSetup from "../components/CharacterSetup";
import DialogueTimeline from "../components/DialogueTimeline";
import { useAppUserId } from "../utils/useAppUserId";

// Reasonable defaults — these match real model ids from models/index.js.
const DEFAULT_TTS_MODEL = "elevenlabs/v3";
const DEFAULT_LIPSYNC_MODEL = "sync/lipsync-2-pro";

export default function TimelinePage() {
  const [characters, setCharacters] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [credits, setCredits] = useState(null);
  const { userId, isReady } = useAppUserId();

  const charactersReady = characters.length > 0 && characters.every((c) => c.faceUrl);
  const canGenerate = charactersReady && blocks.length > 0 && !loading;

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
          characters: characters.map((c) => ({ id: c.id, name: c.name, faceUrl: c.faceUrl })),
          blocks,
          ttsModelId: DEFAULT_TTS_MODEL,
          lipsyncModelId: DEFAULT_LIPSYNC_MODEL,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResult(data);

      if (typeof data.creditsRemaining === "number") {
        setCredits(data.creditsRemaining);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="studio-root">
      <div className="studio-gold-bar" />
      <div className="studio-overlay" />
      <div className="studio-layout">
        <div className="panel-root timeline-page">
          <div className="panel-header">
            <h1>Character Timeline</h1>
            <p>Set up your characters, write the dialogue, generate one video.</p>
            <a href="/studio" className="panel-link">
              ← Back to Studio
            </a>
          </div>

          <div className="panel-row">
            <div className="panel-full">
              <CharacterSetup characters={characters} onChange={setCharacters} />
            </div>
          </div>

          <div className="panel-row">
            <div className="panel-full">
              <DialogueTimeline characters={characters} blocks={blocks} onChange={setBlocks} />
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
              {loading ? "Generating timeline video…" : "Generate Video"}
            </button>
          </div>

          {!charactersReady && characters.length > 0 && (
            <p className="timeline-hint">
              Every character needs a face image uploaded before you can generate.
            </p>
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
    </div>
  );
}
