// components/ByokKeyManager.jsx
//
// Lets Pro/Premium subscribers save their own ElevenLabs API key, so
// the voice picker and TTS generation use THEIR full account (all
// voices, including custom/cloned ones) at zero credit cost.

import { useEffect, useState } from "react";

export default function ByokKeyManager({ userId, onStatusChange }) {
  const [hasKey, setHasKey] = useState(null); // null = loading
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/byok-key?userId=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        setHasKey(!!data.hasKey);
        onStatusChange?.(!!data.hasKey);
      })
      .catch(() => setHasKey(false));
  }, [userId]);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/byok-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, apiKey: inputValue.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save key");
      }

      setHasKey(true);
      setInputValue("");
      setExpanded(false);
      onStatusChange?.(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/byok-key", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove key");
      }

      setHasKey(false);
      onStatusChange?.(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (hasKey === null) return null; // still loading

  return (
    <div className="byok-manager">
      {hasKey ? (
        <div className="byok-status byok-active">
          <span>✓ Using your own ElevenLabs key — full voice library, no credits charged</span>
          <button type="button" onClick={handleRemove} disabled={saving} className="byok-link-btn">
            Remove
          </button>
        </div>
      ) : (
        <div className="byok-status">
          {!expanded ? (
            <button type="button" onClick={() => setExpanded(true)} className="byok-link-btn">
              Pro/Premium perk: connect your own ElevenLabs key →
            </button>
          ) : (
            <div className="byok-form-wrapper">
              <div className="byok-instructions">
                <p className="byok-instructions-title">How this works:</p>
                <ol>
                  <li>
                    Go to{" "}
                    <a href="https://elevenlabs.io" target="_blank" rel="noreferrer">
                      elevenlabs.io
                    </a>{" "}
                    and sign in (or create a free account).
                  </li>
                  <li>
                    Open the{" "}
                    <a
                      href="https://elevenlabs.io/app/voice-library"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voice Library
                    </a>{" "}
                    and add the voices you want (click "Add to my voices" on
                    each one you like) — this is what builds YOUR personal
                    voice collection.
                  </li>
                  <li>
                    Go to{" "}
                    <a
                      href="https://elevenlabs.io/app/developers/api-keys"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Developers → API Keys
                    </a>{" "}
                    and copy your key.
                  </li>
                  <li>Paste it below — only voices in YOUR account will show up here.</li>
                </ol>
              </div>
              <div className="byok-form">
                <input
                  type="password"
                  placeholder="Paste your ElevenLabs API key"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="byok-input"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !inputValue.trim()}
                  className="byok-save-btn"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="byok-error">{error}</p>}

      <style jsx>{`
        .byok-manager {
          font-size: 0.78rem;
        }

        .byok-status {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .byok-active {
          color: #86efac;
        }

        .byok-link-btn {
          background: none;
          border: none;
          color: #f3d98b;
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.78rem;
          padding: 0;
        }

        .byok-form-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .byok-instructions {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 10px 12px;
        }

        .byok-instructions-title {
          margin: 0 0 6px;
          font-weight: 600;
          color: #f3d98b;
        }

        .byok-instructions ol {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .byok-instructions a {
          color: #f3d98b;
          text-decoration: underline;
        }

        .byok-form {
          display: flex;
          gap: 6px;
          width: 100%;
        }

        .byok-input {
          flex: 1;
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 8px;
          color: #d9d9d9;
          font-size: 0.8rem;
        }

        .byok-save-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #f3d98b, #c9a227);
          color: #0a0a0c;
          font-weight: 600;
          font-size: 0.78rem;
          cursor: pointer;
        }

        .byok-error {
          color: #fca5a5;
          margin: 4px 0 0;
        }
      `}</style>
    </div>
  );
}
