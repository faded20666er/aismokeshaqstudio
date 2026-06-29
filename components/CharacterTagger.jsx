// components/CharacterTagger.jsx
//
// Step 2 of the Multi-Character Timeline: draw a bounding box around
// each character's face/head in the shared scene (photo or video's
// first frame), then name that box. Replaces the old per-character
// face-upload flow — there's one shared image now, and characters are
// regions within it, not separate uploads.
//
// Boxes are stored as percentages of the rendered image's width/height
// (not raw pixels) so they stay correct regardless of how large the
// preview is rendered on screen, and translate cleanly to whatever
// pixel dimensions the actual source image/video frame turns out to be
// when sent to the backend for cropping.

import { useRef, useState } from "react";

// Capped at 3 for launch, not 5. The underlying model (InfiniteTalk)
// only natively supports 2 simultaneous speakers per call via bounding
// box + audio track pairs. A 3rd character requires a second
// sequential pass layered onto the first pass's output, which carries
// real risk of visual artifacts on the already-synced faces. Starting
// conservative; raise this once live testing confirms pass-3 quality
// holds up. See pages/api/timeline-generate.js for the generation
// logic this constrains.
const MAX_CHARACTERS = 3;
const BOX_COLORS = ["#ff8a2a", "#f3d98b", "#7dd3fc", "#86efac", "#f9a8d4"];

export default function CharacterTagger({ scene, characters, onChange }) {
  const containerRef = useRef(null);
  const [drawing, setDrawing] = useState(null); // { startX, startY, x, y } in percent

  const canAddMore = characters.length < MAX_CHARACTERS;
  const mediaUrl = scene?.previewUrl;

  function getRelativeCoords(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
    const y = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 0), 100);
    return { x, y };
  }

  function handleMouseDown(e) {
    if (!canAddMore || !mediaUrl) return;
    const { x, y } = getRelativeCoords(e);
    setDrawing({ startX: x, startY: y, x, y });
  }

  function handleMouseMove(e) {
    if (!drawing) return;
    const { x, y } = getRelativeCoords(e);
    setDrawing((d) => ({ ...d, x, y }));
  }

  function handleMouseUp() {
    if (!drawing) return;

    const box = {
      left: Math.min(drawing.startX, drawing.x),
      top: Math.min(drawing.startY, drawing.y),
      width: Math.abs(drawing.x - drawing.startX),
      height: Math.abs(drawing.y - drawing.startY),
    };

    setDrawing(null);

    // Ignore accidental tiny clicks/drags — require a real box.
    if (box.width < 2 || box.height < 2) return;

    const newCharacter = {
      id: crypto.randomUUID ? crypto.randomUUID() : `char-${Date.now()}`,
      name: `Character ${characters.length + 1}`,
      box,
    };

    onChange([...characters, newCharacter]);
  }

  function updateCharacter(id, updates) {
    onChange(characters.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function removeCharacter(id) {
    onChange(characters.filter((c) => c.id !== id));
  }

  const drawingBox = drawing
    ? {
        left: Math.min(drawing.startX, drawing.x),
        top: Math.min(drawing.startY, drawing.y),
        width: Math.abs(drawing.x - drawing.startX),
        height: Math.abs(drawing.y - drawing.startY),
      }
    : null;

  return (
    <div className="character-tagger">
      <div className="tagger-header">
        <span className="section-label text-silver-red">Tag Characters</span>
        <span className="section-meta">
          {characters.length} / {MAX_CHARACTERS} — drag a box around each face
        </span>
      </div>

      {!mediaUrl && (
        <p className="tagger-hint">Upload a scene above to start tagging characters.</p>
      )}

      {mediaUrl && (
        <div
          ref={containerRef}
          className="tagger-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {scene.mediaType === "video" ? (
            <video src={mediaUrl} className="tagger-media" muted />
          ) : (
            <img src={mediaUrl} alt="Scene" className="tagger-media" draggable={false} />
          )}

          {characters.map((char, i) => (
            <div
              key={char.id}
              className="tagger-box"
              style={{
                left: `${char.box.left}%`,
                top: `${char.box.top}%`,
                width: `${char.box.width}%`,
                height: `${char.box.height}%`,
                borderColor: BOX_COLORS[i % BOX_COLORS.length],
              }}
            >
              <span
                className="tagger-box-label"
                style={{ background: BOX_COLORS[i % BOX_COLORS.length] }}
              >
                {char.name}
              </span>
            </div>
          ))}

          {drawingBox && (
            <div
              className="tagger-box tagger-box-drawing"
              style={{
                left: `${drawingBox.left}%`,
                top: `${drawingBox.top}%`,
                width: `${drawingBox.width}%`,
                height: `${drawingBox.height}%`,
              }}
            />
          )}

          {!canAddMore && (
            <div className="tagger-limit-note">Max {MAX_CHARACTERS} characters reached</div>
          )}
        </div>
      )}

      {characters.length > 0 && (
        <div className="tagger-list">
          {characters.map((char, i) => (
            <div key={char.id} className="tagger-list-item">
              <span
                className="tagger-swatch"
                style={{ background: BOX_COLORS[i % BOX_COLORS.length] }}
              />
              <input
                type="text"
                className="tagger-name-input"
                value={char.name}
                onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                placeholder="Character name"
              />
              <button
                className="tagger-remove-btn"
                onClick={() => removeCharacter(char.id)}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .character-tagger {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tagger-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tagger-hint {
          font-size: 0.85rem;
          opacity: 0.6;
          margin: 0;
        }

        .tagger-canvas {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.4);
          cursor: crosshair;
          user-select: none;
        }

        .tagger-media {
          width: 100%;
          max-height: 480px;
          object-fit: contain;
          display: block;
          pointer-events: none;
        }

        .tagger-box {
          position: absolute;
          border: 2px solid;
          border-radius: 4px;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
          pointer-events: none;
        }

        .tagger-box-drawing {
          border-color: #fff;
          border-style: dashed;
          background: rgba(255, 255, 255, 0.08);
        }

        .tagger-box-label {
          position: absolute;
          top: -22px;
          left: -2px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #0a0a0c;
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .tagger-limit-note {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          text-align: center;
          background: rgba(0, 0, 0, 0.75);
          color: #fcd34d;
          font-size: 0.75rem;
          border-radius: 8px;
          padding: 6px 0;
        }

        .tagger-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tagger-list-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tagger-swatch {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .tagger-name-input {
          flex: 1;
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 8px;
          color: #d9d9d9;
          font-size: 0.85rem;
        }

        .tagger-remove-btn {
          background: transparent;
          border: none;
          color: #fca5a5;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 4px 6px;
        }
      `}</style>
    </div>
  );
}
