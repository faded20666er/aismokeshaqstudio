// components/DialogueTimeline.jsx
//
// Step 2 of the multi-character timeline feature: a single shared
// timeline where each dialogue block is tagged to one of the
// characters set up in CharacterSetup. Mirrors Dzine's flow — pick
// who's speaking from a dropdown, type the line, and it's placed on
// the timeline in time order.

import { useState } from "react";

export default function DialogueTimeline({ characters, blocks, onChange }) {
  const [draftCharacterId, setDraftCharacterId] = useState(characters[0]?.id || "");
  const [draftText, setDraftText] = useState("");
  const [draftDuration, setDraftDuration] = useState(3);

  const totalDuration = blocks.reduce((sum, b) => sum + b.duration, 0);

  function characterById(id) {
    return characters.find((c) => c.id === id);
  }

  function addBlock() {
    if (!draftCharacterId || !draftText.trim()) return;

    const newBlock = {
      id: crypto.randomUUID ? crypto.randomUUID() : `block-${Date.now()}`,
      characterId: draftCharacterId,
      text: draftText.trim(),
      duration: Math.max(1, Number(draftDuration) || 3),
      startTime: totalDuration, // appended after the last block by default
    };

    onChange([...blocks, newBlock]);
    setDraftText("");
  }

  function removeBlock(id) {
    // Recompute startTime for everything after the removed block so
    // the timeline stays contiguous with no gaps.
    const filtered = blocks.filter((b) => b.id !== id);
    let runningTime = 0;
    const recalculated = filtered.map((b) => {
      const updated = { ...b, startTime: runningTime };
      runningTime += b.duration;
      return updated;
    });
    onChange(recalculated);
  }

  function moveBlock(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const reordered = [...blocks];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    let runningTime = 0;
    const recalculated = reordered.map((b) => {
      const updated = { ...b, startTime: runningTime };
      runningTime += b.duration;
      return updated;
    });

    onChange(recalculated);
  }

  if (characters.length === 0) {
    return (
      <p className="timeline-empty-note">
        Add at least one character above before building the timeline.
      </p>
    );
  }

  return (
    <div className="dialogue-timeline">
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

        <input
          type="text"
          className="dialogue-text-input"
          placeholder="What does this character say?"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
        />

        <input
          type="number"
          min={1}
          max={30}
          className="dialogue-duration-input"
          value={draftDuration}
          onChange={(e) => setDraftDuration(e.target.value)}
          title="Duration in seconds"
        />
        <span className="dialogue-duration-label">sec</span>

        <button className="dialogue-add-btn" onClick={addBlock} type="button">
          + Add to Timeline
        </button>
      </div>

      {/* TIMELINE TRACK */}
      <div className="timeline-track">
        {blocks.length === 0 ? (
          <p className="timeline-empty-note">No dialogue yet — add a line above.</p>
        ) : (
          blocks.map((block, index) => {
            const character = characterById(block.characterId);
            return (
              <div key={block.id} className="timeline-block">
                <div className="timeline-block-meta">
                  <span className="timeline-block-character">
                    {character ? character.name : "Unknown"}
                  </span>
                  <span className="timeline-block-time">
                    {block.startTime}s – {block.startTime + block.duration}s
                  </span>
                </div>
                <p className="timeline-block-text">{block.text}</p>
                <div className="timeline-block-actions">
                  <button
                    type="button"
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => removeBlock(block.id)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {blocks.length > 0 && (
        <p className="timeline-total">Total runtime: {totalDuration}s</p>
      )}

      <style jsx>{`
        .dialogue-timeline {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dialogue-form {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .dialogue-character-select,
        .dialogue-duration-input {
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 8px;
          color: #d9d9d9;
          font-size: 0.85rem;
        }

        .dialogue-text-input {
          flex: 1;
          min-width: 160px;
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 8px;
          color: #d9d9d9;
          font-size: 0.85rem;
        }

        .dialogue-duration-input {
          width: 60px;
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

        .timeline-block-actions {
          display: flex;
          gap: 6px;
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

        .timeline-block-actions button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
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
