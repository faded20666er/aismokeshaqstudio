// components/VoicePicker.jsx
//
// Live search against ElevenLabs' real voice library — shows actual
// results from their full catalog (thousands of voices), filterable by
// gender, instead of a small fixed list. Only shown when the selected
// TTS model is ElevenLabs; other TTS models don't have this kind of
// searchable catalog available.

import { useEffect, useState } from "react";

export default function VoicePicker({ onSelect }) {
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("");
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);

  async function search() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (gender) params.set("gender", gender);

      const res = await fetch(`/api/elevenlabs-voices?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Search failed");

      setVoices(data.voices || []);
    } catch (err) {
      setError(err.message || "Couldn't load voices");
    } finally {
      setLoading(false);
    }
  }

  // Initial load with no filters, so the picker isn't empty on first render.
  useEffect(() => {
    search();
  }, []);

  function handleSelect(voice) {
    setSelectedVoiceId(voice.id);
    onSelect(voice);
  }

  return (
    <div className="voice-picker">
      <div className="voice-search-row">
        <input
          type="text"
          className="voice-search-input"
          placeholder="Search voices by name or style..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <select
          className="voice-gender-select"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Any gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="neutral">Neutral</option>
        </select>
        <button className="voice-search-btn" onClick={search} type="button">
          Search
        </button>
      </div>

      {loading && <p className="voice-status">Searching voices…</p>}
      {error && <p className="voice-status voice-error">{error}</p>}

      {!loading && !error && (
        <div className="voice-results">
          {voices.length === 0 ? (
            <p className="voice-status">No voices found — try a different search.</p>
          ) : (
            voices.map((voice) => (
              <button
                key={voice.id}
                type="button"
                className={`voice-card ${selectedVoiceId === voice.id ? "selected" : ""}`}
                onClick={() => handleSelect(voice)}
              >
                <span className="voice-name">{voice.name}</span>
                <span className="voice-tags">
                  {voice.gender}
                  {voice.accent ? ` · ${voice.accent}` : ""}
                  {voice.useCase ? ` · ${voice.useCase}` : ""}
                </span>
                {voice.previewUrl && (
                  <audio
                    src={voice.previewUrl}
                    controls
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                )}
              </button>
            ))
          )}
        </div>
      )}

      <style jsx>{`
        .voice-picker {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .voice-search-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .voice-search-input {
          flex: 1;
          min-width: 160px;
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 8px 10px;
          color: #d9d9d9;
          font-size: 0.85rem;
        }

        .voice-gender-select {
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 8px 10px;
          color: #d9d9d9;
          font-size: 0.85rem;
        }

        .voice-search-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #ff2a2a, #ff8a2a);
          color: #0b0b0d;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .voice-status {
          font-size: 0.8rem;
          opacity: 0.7;
        }

        .voice-error {
          color: #fca5a5;
        }

        .voice-results {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 8px;
          max-height: 280px;
          overflow-y: auto;
        }

        .voice-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          text-align: left;
        }

        .voice-card.selected {
          border-color: rgba(255, 138, 42, 0.8);
          box-shadow: 0 0 10px rgba(255, 138, 42, 0.3);
        }

        .voice-name {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .voice-tags {
          font-size: 0.72rem;
          opacity: 0.7;
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
}
