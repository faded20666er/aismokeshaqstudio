// components/CharacterSetup.jsx
//
// Step 1 of the multi-character timeline feature: upload/name up to
// 5 character faces before building dialogue on the timeline. Mirrors
// the Dzine-style flow — pick faces and name them first, THEN assign
// dialogue to those names on a shared timeline.
//
// Face images are uploaded to Vercel Blob (via /api/upload-face) so
// they get a real public URL — Replicate's lipsync models need a
// fetchable URL, not a browser-local object URL.

import { useState } from "react";

const MAX_CHARACTERS = 5;

export default function CharacterSetup({ characters, onChange }) {
  const [localError, setLocalError] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  function addCharacter() {
    if (characters.length >= MAX_CHARACTERS) {
      setLocalError(`You can have up to ${MAX_CHARACTERS} characters.`);
      return;
    }
    setLocalError(null);
    onChange([
      ...characters,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `char-${Date.now()}`,
        name: `Character ${characters.length + 1}`,
        faceUrl: null,
        facePreviewUrl: null,
        uploadError: null,
      },
    ]);
  }

  function updateCharacter(id, updates) {
    onChange(characters.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function removeCharacter(id) {
    onChange(characters.filter((c) => c.id !== id));
  }

  async function handleFaceUpload(id, file) {
    if (!file) return;

    // Show an immediate local preview while the real upload happens.
    const previewUrl = URL.createObjectURL(file);
    updateCharacter(id, { facePreviewUrl: previewUrl, uploadError: null });

    setUploadingId(id);

    try {
      const res = await fetch(`/api/upload-face?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }

      updateCharacter(id, { faceUrl: data.url });
    } catch (err) {
      updateCharacter(id, { uploadError: err.message || "Upload failed" });
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="character-setup">
      <div className="character-setup-header">
        <span className="section-label text-silver-red">Characters</span>
        <span className="section-meta">
          {characters.length} / {MAX_CHARACTERS}
        </span>
      </div>

      {localError && <p className="character-error">{localError}</p>}

      <div className="character-grid">
        {characters.map((char, index) => (
          <div key={char.id} className="character-card">
            <div className="character-face-upload">
              {char.facePreviewUrl ? (
                <img src={char.facePreviewUrl} alt={char.name} className="character-face-preview" />
              ) : (
                <div className="character-face-placeholder">#{index + 1}</div>
              )}
              <input
                type="file"
                accept="image/*"
                className="character-file-input"
                onChange={(e) => handleFaceUpload(char.id, e.target.files[0])}
              />
              {uploadingId === char.id && (
                <div className="character-uploading-badge">Uploading…</div>
              )}
            </div>

            {char.uploadError && (
              <p className="character-upload-error">{char.uploadError}</p>
            )}

            <input
              type="text"
              className="character-name-input"
              value={char.name}
              onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
              placeholder="Character name"
            />

            <button
              className="character-remove-btn"
              onClick={() => removeCharacter(char.id)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}

        {characters.length < MAX_CHARACTERS && (
          <button className="character-add-btn" onClick={addCharacter} type="button">
            + Add Character
          </button>
        )}
      </div>

      <style jsx>{`
        .character-setup {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .character-setup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .character-error {
          color: #fca5a5;
          font-size: 0.8rem;
          margin: 0;
        }

        .character-upload-error {
          color: #fca5a5;
          font-size: 0.7rem;
          margin: 0;
        }

        .character-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }

        .character-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .character-face-upload {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .character-face-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .character-face-placeholder {
          font-size: 1.4rem;
          opacity: 0.5;
        }

        .character-file-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .character-uploading-badge {
          position: absolute;
          bottom: 4px;
          left: 4px;
          right: 4px;
          text-align: center;
          background: rgba(0, 0, 0, 0.75);
          color: #fff;
          font-size: 0.65rem;
          border-radius: 6px;
          padding: 2px 0;
          pointer-events: none;
        }

        .character-name-input {
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 8px;
          color: #d9d9d9;
          font-size: 0.85rem;
        }

        .character-remove-btn {
          background: transparent;
          border: none;
          color: #fca5a5;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 2px 0;
        }

        .character-add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1;
          border-radius: 12px;
          border: 1px dashed rgba(255, 255, 255, 0.3);
          background: transparent;
          color: #d9d9d9;
          cursor: pointer;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
