// components/DialogueTimeline.jsx
//
// Step 3 of the Multi-Character Timeline: build a shared timeline of
// dialogue lines, each assigned to one of the tagged characters from
// CharacterTagger. Each line's audio can either be uploaded directly
// or generated from typed text via TTS (ElevenLabs voice, picked once
// per character and reused across all of that character's lines —
// real productions cast one voice per character, not one per line).
//
// Gaps are supported: startTime is independently editable, so blocks
// don't have to butt up against each other — silence between lines is
// just an unfilled span on the timeline.

import { useState, useEffect } from "react";
import VoicePicker from "./VoicePicker";
import TimelineEditor from "./TimelineEditor";

export default function DialogueTimeline({
  characters,
  blocks,
  onChange,
  onCharacterVoiceChange,
  userId,
  clipSeconds,
  onClipSecondsChange,
  maxClipSeconds,
}) {
  const [draftCharacterId, setDraftCharacterId] = useState(characters[0]?.id || "");

  // useState's initial value only runs once, at first mount — but
  // characters is almost always EMPTY at that moment (users tag
  // characters after this component is already on screen). Without
  // this effect, draftCharacterId stays "" forever unless the user
  // manually touches the dropdown, which silently blocks every
  // "Add to Timeline" click (addBlock bails out early on an empty
  // characterId) with no visible error — exactly the bug reported.
  useEffect(() => {
    const stillValid = characters.some((c) => c.id === draftCharacterId);
    if (!stillValid) {
      setDraftCharacterId(characters[0]?.id || "");
    }
  }, [characters, draftCharacterId]);
  const [draftText, setDraftText] = useState("");
  const [draftAudioFile, setDraftAudioFile] = useState(null);
  const [draftStartTime, setDraftStartTime] = useState(0);
  const [draftDuration, setDraftDuration] = useState(3);
  const [audioMode, setAudioMode] = useState("tts"); // "tts" | "upload"
  const [voicePickerOpenFor, setVoicePickerOpenFor] = useState(null); // characterId

  const totalDuration = blocks.reduce(
    (max, b) => Math.max(max, b.startTime + b.duration),
    0
  );

  function characterById(id) {
    return characters.find((c) => c.id === id);
  }

  function handleVoicePick(characterId, voice) {
    onCharacterVoiceChange(characterId, voice);
    setVoicePickerOpenFor(null);
  }

  async function addBlock() {
    if (!draftCharacterId) return;
    if (audioMode === "tts" && !draftText.trim()) return;
    if (audioMode === "upload" && !draftAudioFile) return;

    let audioUrl = null;
    let uploadedFileName = null;

    if (audioMode === "upload" && draftAudioFile) {
      try {
        const res = await fetch(
          `/api/upload-face?filename=${encodeURIComponent(draftAudioFile.name)}`,
          {
            method: "POST",
            headers: { "Content-Type": draftAudioFile.type || "application/octet-stream" },
            body: draftAudioFile,
          }
        );
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || "Audio upload failed");
        audioUrl = data.url;
        uploadedFileName = draftAudioFile.name;
      } catch (err) {
        alert(err.message || "Audio upload failed"); // simple inline failure, no block added
        return;
      }
    }

    const newBlock = {
      id: crypto.randomUUID ? crypto.randomUUID() : `block-${Date.now()}`,
      characterId: draftCharacterId,
      audioSource: audioMode, // "tts" or "upload"
      text: audioMode === "tts" ? draftText.trim() : "",
      audioUrl, // set if uploaded; null if TTS (generated server-side at render time)
      audioFileName: uploadedFileName,
      duration: Math.max(1, Number(draftDuration) || 3),
      startTime: Math.max(0, Number(draftStartTime) || 0),
    };

    onChange([...blocks, newBlock]);
    setDraftText("");
    setDraftAudioFile(null);
    setDraftStartTime(newBlock.startTime + newBlock.duration); // suggest next slot, no gap by default
  }

  if (characters.length === 0) {
    return (
      <p className="timeline-empty-note">
        Tag at least one character above before building the dialogue timeline.
      </p>
    );
  }

  return (
    <div className="dialogue-timeline">
      {/* PER-CHARACTER VOICE ASSIGNMENT (for TTS lines) */}
      <div className="voice-assign-row">
        {characters.map((char) => (
          <div key={char.id} className="voice-assign-chip">
            <span className="voice-assign-name">{char.name}</span>
            <button
              type="button"
              className="voice-assign-btn"
              onClick={() =>
                setVoicePickerOpenFor(voicePickerOpenFor === char.id ? null : char.id)
              }
            >
              {char.voice ? char.voice.name : "Pick voice"}
            </button>
          </div>
        ))}
      </div>

      {voicePickerOpenFor && (
        <div className="voice-picker-popover">
          <VoicePicker
            userId={userId}
            onSelect={(voice) => handleVoicePick(voicePickerOpenFor, voice)}
          />
        </div>
      )}

      {/* ADD DIALOGUE FORM */}
      <div className="dialogue-form">
        <select
          className="dialogue-character-select"
          value={draftCharacterId}
          onChange={(e) => setDraftCharacterId(e.target.value)}
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="audio-mode-toggle">
          <button
            type="button"
            className={`audio-mode-btn ${audioMode === "tts" ? "active" : ""}`}
            onClick={() => setAudioMode("tts")}
          >
            Type (TTS)
          </button>
          <button
            type="button"
            className={`audio-mode-btn ${audioMode === "upload" ? "active" : ""}`}
            onClick={() => setAudioMode("upload")}
          >
            Upload Audio
          </button>
        </div>

        {audioMode === "tts" ? (
          <input
            type="text"
            className="dialogue-text-input"
            placeholder="What does this character say?"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />
        ) : (
          <input
            type="file"
            accept="audio/*"
            className="dialogue-audio-input"
            onChange={(e) => setDraftAudioFile(e.target.files[0])}
          />
        )}

        <div className="dialogue-timing">
          <label>
            Default length
            <input
              type="number"
              min={1}
              max={30}
              className="dialogue-time-input"
              value={draftDuration}
              onChange={(e) => setDraftDuration(e.target.value)}
            />
          </label>
          <span className="dialogue-duration-label">sec — drag to adjust after adding</span>
        </div>

        <button className="dialogue-add-btn" onClick={addBlock} type="button">
          + Add to Timeline
        </button>
      </div>

      {/* VISUAL TIMELINE — drag to move, drag edges to stretch */}
      <TimelineEditor
        characters={characters}
        blocks={blocks}
        onChange={onChange}
        clipSeconds={clipSeconds}
        onClipSecondsChange={onClipSecondsChange}
        maxClipSeconds={maxClipSeconds}
      />

      {blocks.length > 0 && (
        <p className="timeline-total">Total runtime: {totalDuration}s</p>
      )}

      <style jsx>{`
        .dialogue-timeline {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .voice-assign-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .voice-assign-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          padding: 4px 10px;
        }

        .voice-assign-name {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .voice-assign-btn {
          background: transparent;
          border: none;
          color: #f3d98b;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .voice-picker-popover {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 10px;
          background: rgba(5, 5, 8, 0.95);
        }

        .dialogue-form {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .dialogue-character-select {
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 8px;
          color: #d9d9d9;
          font-size: 0.85rem;
        }

        .audio-mode-toggle {
          display: flex;
          gap: 4px;
        }

        .audio-mode-btn {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.05);
          color: #d9d9d9;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .audio-mode-btn.active {
          background: linear-gradient(135deg, #ff2a2a, #ff8a2a);
          color: #0b0b0d;
          font-weight: 600;
          border-color: transparent;
        }

        .dialogue-text-input,
        .dialogue-audio-input {
          flex: 1;
          min-width: 160px;
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 8px;
          color: #d9d9d9;
          font-size: 0.85rem;
        }

        .dialogue-timing {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 0.7rem;
          opacity: 0.8;
        }

        .dialogue-timing label {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dialogue-time-input {
          width: 56px;
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 5px 6px;
          color: #d9d9d9;
          font-size: 0.8rem;
        }

        .dialogue-duration-label {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .dialogue-add-btn {
          padding: 7px 14px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #ff2a2a, #ff8a2a);
          color: #0b0b0d;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .timeline-track {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 320px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .timeline-empty-note {
          font-size: 0.85rem;
          opacity: 0.6;
        }

        .timeline-block {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .timeline-block-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          opacity: 0.8;
          margin-bottom: 4px;
        }

        .timeline-block-character {
          font-weight: 600;
          color: #ff8a2a;
        }

        .timeline-block-text {
          margin: 0 0 6px 0;
          font-size: 0.9rem;
        }

        .timeline-block-audio-note {
          opacity: 0.75;
          font-style: italic;
        }

        .timeline-block-actions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .timeline-block-time-edit {
          width: 56px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #d9d9d9;
          border-radius: 6px;
          padding: 3px 6px;
          font-size: 0.75rem;
        }

        .timeline-block-actions button {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #d9d9d9;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .timeline-total {
          font-size: 0.8rem;
          opacity: 0.7;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
