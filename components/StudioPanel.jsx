// components/StudioPanel.jsx
//
// StudioPanel no longer owns its own fetch/generate logic. Previously
// BOTH this component and pages/studio.jsx independently called
// /api/generate with their own copies of loading/error/output state —
// they fought over the same responsibility and only one was ever
// actually wired to the visible UI. Now studio.jsx owns the network
// call and passes everything down as props, so there's exactly one
// source of truth.

import { useState, useEffect } from "react";
import ModelSelector from "./ModelSelector";
import VoicePicker from "./VoicePicker";
import ByokKeyManager from "./ByokKeyManager";
import AgeGate from "./AgeGate";

// Renders generated output as the right media type — lipsync/video
// produce video, TTS produces audio, image/NSFW-image produce images.
// Falls back to raw JSON if the shape is unexpected, so nothing ever
// renders as a broken/blank box.
function OutputPreview({ item, category }) {
  if (typeof item !== "string") {
    return <pre>{JSON.stringify(item, null, 2)}</pre>;
  }

  const isDataUrl = item.startsWith("data:");
  const isHttpUrl = item.startsWith("http");

  if (!isDataUrl && !isHttpUrl) {
    return <pre>{JSON.stringify(item, null, 2)}</pre>;
  }

  if (category === "video" || category === "lipsync") {
    return <video src={item} controls style={{ maxWidth: "100%", borderRadius: 12 }} />;
  }

  if (category === "tts") {
    return <audio src={item} controls style={{ width: "100%" }} />;
  }

  return <img src={item} alt="output" />;
}

export default function StudioPanel({ onGenerate, loading, statusMessage, error, credits, output, userId }) {
  const [category, setCategory] = useState("image");
  const [selectedModel, setSelectedModel] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{file, previewUrl}]
  const [faceFile, setFaceFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [usingOwnKey, setUsingOwnKey] = useState(false);
  const [nsfwEnabled, setNsfwEnabled] = useState(false);
  const [nsfwAgeVerified, setNsfwAgeVerified] = useState(false);
  const [showNsfwAgeGate, setShowNsfwAgeGate] = useState(false);

  // Check if user has already completed NSFW age verification on this browser
  // (runs once on mount — skips the gate for returning users who already agreed)
  useEffect(() => {
    try {
      if (window.localStorage.getItem("smokeshaq_nsfw_age_verified") === "true") {
        setNsfwAgeVerified(true);
      }
    } catch {
      // localStorage unavailable — gate will show every session, which is the safe default
    }
  }, []);

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleNsfwToggle(enabling) {
    if (enabling && !nsfwAgeVerified) {
      // User wants to turn on NSFW but hasn't verified age yet — show the gate
      setShowNsfwAgeGate(true);
      return;
    }
    setNsfwEnabled(enabling);
  }

  function handleNsfwVerified() {
    try {
      window.localStorage.setItem("smokeshaq_nsfw_age_verified", "true");
    } catch {}
    setNsfwAgeVerified(true);
    setNsfwEnabled(true);
    setShowNsfwAgeGate(false);
  }

  function handleNsfwDeclined() {
    setShowNsfwAgeGate(false);
    // Don't change nsfwEnabled — if it was off, it stays off
  }

  async function handleGenerateClick() {
    if (!selectedModel) return;

    const inputs = { prompt };

    if (uploadedFiles.length > 0) {
      inputs.images = await Promise.all(uploadedFiles.map((f) => fileToDataUrl(f.file)));
      inputs.image = inputs.images[0]; // backwards-compat for single-image models
    }

    if (category === "tts" && selectedVoice) {
      inputs.voiceId = selectedVoice.id;
    }

    if (category === "lipsync") {
      if (!faceFile) return; // require a face before allowing generate
      inputs.face = await fileToDataUrl(faceFile);
      if (audioFile) {
        inputs.audio = await fileToDataUrl(audioFile);
      }
      if (selectedModel?.creditsPerSecond) {
        inputs.durationSeconds = durationSeconds;
      }
      // if no audioFile, the backend falls back to generating TTS from
      // `prompt` first, then lipsyncing that — handled server-side.
    }

    // category determines which endpoint the parent should call —
    // image/video both use /api/generate, lipsync and tts have their
    // own endpoints since they take different inputs (audio files,
    // face images, etc).
    await onGenerate({
      category,
      modelId: selectedModel.id,
      nsfwEnabled,
      inputs,
    });
  }

  const categoryLabel = {
    image: "Image Generation",
    video: "Video / Animation",
    lipsync: "Talking Photo",
    tts: "Voice / TTS",
  }[category];

  return (
    <div className="studio-panel glass-shell">
      <div className="panel-gold-bar" />
      {/* CATEGORY TABS */}
      <div className="category-header">
        <span className="section-label text-silver-red">Mode</span>
        <div className="category-tabs">
          {[
            { key: "image", label: "IMAGE" },
            { key: "video", label: "VIDEO" },
            { key: "lipsync", label: "TALKING PHOTO" },
            { key: "tts", label: "TTS" },
          ].map(({ key: cat, label }) => (
            <button
              key={cat}
              className={`tab-btn ${category === cat ? "active" : ""}`}
              onClick={() => {
                setCategory(cat);
                setSelectedModel(null);
                setUploadedFiles((prev) => {
                  prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                  return [];
                });
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="category-subtitle">{categoryLabel}</p>

      {/* MODEL SELECTOR */}
      <div className="section-block">
        <div className="section-header">
          <span className="section-label text-silver-red">Model</span>
          {selectedModel && (
            <span className="section-meta">
              {selectedModel.name} · {selectedModel.credits} credits
            </span>
          )}
        </div>
        <ModelSelector
          category={category}
          nsfwEnabled={nsfwEnabled}
          onSelect={(m) => setSelectedModel(m)}
        />
      </div>

      {/* LIPSYNC-SPECIFIC INPUTS */}
      {category === "lipsync" && (
        <>
          <div className="section-block">
            <div className="section-header">
              <span className="section-label text-silver-red">Face</span>
              <span className="section-meta">Photo or character frame</span>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              className="file-input"
              onChange={(e) => setFaceFile(e.target.files[0])}
            />
          </div>

          <div className="section-block">
            <div className="section-header">
              <span className="section-label text-silver-red">Audio source</span>
              <span className="section-meta">Upload audio, or type a script below</span>
            </div>
            <input
              type="file"
              accept="audio/*"
              className="file-input"
              onChange={(e) => setAudioFile(e.target.files[0])}
            />
          </div>

          {selectedModel?.creditsPerSecond && (
            <div className="section-block">
              <div className="section-header">
                <span className="section-label text-silver-red">Duration</span>
                <span className="section-meta">
                  Up to {Math.floor((selectedModel.maxDurationSeconds || 600) / 60)} min — cost scales with length
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={selectedModel.maxDurationSeconds || 600}
                step={5}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="duration-slider"
              />
              <p className="duration-readout">
                {durationSeconds}s ≈{" "}
                {Math.ceil(durationSeconds * selectedModel.creditsPerSecond)} credits
              </p>
            </div>
          )}
        </>
      )}

      {/* VOICE PICKER (ElevenLabs only — live search of their real library) */}
      {category === "tts" && selectedModel?.id?.startsWith("elevenlabs/") && (
        <div className="section-block">
          {userId && (
            <ByokKeyManager userId={userId} onStatusChange={setUsingOwnKey} />
          )}
          <div className="section-header">
            <span className="section-label text-silver-red">Voice</span>
            {selectedVoice && (
              <span className="section-meta">{selectedVoice.name}</span>
            )}
          </div>
          <VoicePicker userId={userId} onSelect={(v) => setSelectedVoice(v)} />
        </div>
      )}

      {/* PROMPT / SCRIPT INPUT */}
      <div className="section-block">
        <div className="section-header">
          <span className="section-label text-silver-red">
            {category === "tts" || category === "lipsync" ? "Text to speak" : "Prompt"}
          </span>
          {category === "lipsync" && (
            <span className="section-meta">Used if no audio file is uploaded above</span>
          )}
        </div>
        <textarea
          className="prompt-box"
          placeholder={
            category === "tts" || category === "lipsync"
              ? "Type the script or line you want spoken..."
              : "Describe the scene, style, mood, or script you want to create..."
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      {/* FILE UPLOAD (image / video reference only — lipsync has its own inputs above) */}
      {(category === "image" || category === "video") && selectedModel?.imageInputs?.max > 0 && (
        <div className="section-block">
          <div className="section-header">
            <span className="section-label text-silver-red">
              Reference image{selectedModel.imageInputs.max === 1 ? "" : "s"}
            </span>
            <span className="section-meta">
              {selectedModel.imageInputs.min > 0 ? "Required" : "Optional"} ·{" "}
              {uploadedFiles.length} / {selectedModel.imageInputs.max} uploaded
            </span>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple={selectedModel.imageInputs.max > 1}
            className="file-input"
            onChange={(e) => {
              const newFiles = Array.from(e.target.files).slice(0, selectedModel.imageInputs.max - uploadedFiles.length);
              const withPreviews = newFiles.map((f) => ({
                file: f,
                previewUrl: URL.createObjectURL(f),
              }));
              setUploadedFiles((prev) => {
                const combined = [...prev, ...withPreviews].slice(0, selectedModel.imageInputs.max);
                return combined;
              });
              e.target.value = ""; // allow re-selecting same file
            }}
          />
          {uploadedFiles.length > 0 && (
            <div className="upload-thumb-grid">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="upload-thumb">
                  <img src={f.previewUrl} alt={`ref ${i + 1}`} />
                  <button
                    type="button"
                    className="upload-thumb-remove"
                    onClick={() =>
                      setUploadedFiles((prev) => {
                        URL.revokeObjectURL(prev[i].previewUrl);
                        return prev.filter((_, idx) => idx !== i);
                      })
                    }
                    title="Remove"
                  >
                    ✕
                  </button>
                  <span className="upload-thumb-label">#{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NSFW TOGGLE — moved to bottom; hidden for TTS (no NSFW voice models exist) */}
      {category !== "tts" && (
        <div className="nsfw-row">
          <label className="nsfw-toggle">
            <input
              type="checkbox"
              checked={nsfwEnabled}
              onChange={(e) => handleNsfwToggle(e.target.checked)}
            />
            <span className="nsfw-label text-silver-red">Enable NSFW Models</span>
          </label>
          <span className="nsfw-note">Locked models show a 🔒 until NSFW is enabled. You must be 18+ to use this feature, and you are solely responsible for any content you upload or generate.</span>
        </div>
      )}

      {/* CREDITS */}
      {typeof credits === "number" && (
        <div className="section-block">
          <span className="section-meta">Credits remaining: {credits}</span>
        </div>
      )}

      {/* GENERATE BUTTON */}
      <div className="section-block">
        <button
          className="generate-btn"
          disabled={!selectedModel || loading}
          onClick={handleGenerateClick}
        >
          {loading ? statusMessage || "Generating..." : "Generate"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="section-block error-section">
          <p className="error-text">{error}</p>
        </div>
      )}

      {/* OUTPUT */}
      {output && (
        <div className="section-block output-section">
          <div className="section-header">
            <span className="section-label text-silver-red">Output</span>
          </div>

          {Array.isArray(output) ? (
            output.map((item, i) => (
              <div key={i} className="output-item">
                <OutputPreview item={item} category={category} />
              </div>
            ))
          ) : (
            <OutputPreview item={output} category={category} />
          )}
        </div>
      )}

      {/* NSFW Age Gate — only shown when user tries to enable NSFW without prior verification */}
      {showNsfwAgeGate && (
        <AgeGate onConfirm={handleNsfwVerified} onDecline={handleNsfwDeclined} />
      )}

      <style jsx>{`
        .glass-shell {
          background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 55%),
            rgba(10, 10, 12, 0.9);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow:
            0 0 30px rgba(0, 0, 0, 0.8),
            0 0 18px rgba(255, 0, 0, 0.25);
          padding: 22px 20px 26px;
          backdrop-filter: blur(16px);
          max-width: 720px;
          margin: 0 auto;
          overflow: hidden;
          position: relative;
        }

        .panel-gold-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #c9a227, #f3d98b, #ffe9a8, #f3d98b, #c9a227);
          box-shadow: 0 0 16px rgba(255, 215, 0, 0.55);
        }

        .studio-panel {
          display: flex;
          flex-direction: column;
          gap: 18px;
          color: #d9d9d9;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .category-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab-btn {
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          cursor: pointer;
          font-size: 0.8rem;
          letter-spacing: 0.6px;
          color: #d9d9d9;
          transition: 0.18s ease;
        }

        .tab-btn:hover {
          border-color: rgba(255, 0, 0, 0.5);
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.35);
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #ff2a2a, #ff8a2a);
          border-color: rgba(255, 255, 255, 0.4);
          color: #0b0b0d;
          box-shadow:
            0 0 14px rgba(255, 0, 0, 0.6),
            0 0 24px rgba(255, 138, 42, 0.5);
        }

        .category-subtitle {
          font-size: 0.85rem;
          opacity: 0.85;
        }

        .nsfw-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 0.8rem;
        }

        .nsfw-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .nsfw-toggle input {
          accent-color: #ff2a2a;
        }

        .nsfw-note {
          opacity: 0.7;
          font-size: 0.75rem;
        }

        .section-block {
          margin-top: 6px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .section-label {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .section-meta {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .prompt-box {
          width: 100%;
          min-height: 110px;
          background: rgba(5, 5, 8, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 10px 12px;
          color: #d9d9d9;
          font-size: 0.9rem;
          resize: vertical;
          outline: none;
          transition: 0.18s ease;
        }

        .prompt-box:focus {
          border-color: rgba(255, 0, 0, 0.6);
          box-shadow: 0 0 12px rgba(255, 0, 0, 0.4);
        }

        .file-input {
          width: 100%;
          font-size: 0.85rem;
          color: #d9d9d9;
        }

        .duration-slider {
          width: 100%;
          accent-color: #ff8a2a;
        }

        .duration-readout {
          font-size: 0.8rem;
          opacity: 0.8;
          margin: 4px 0 0;
          text-align: right;
        }

        .generate-btn {
          width: 100%;
          padding: 12px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #ff2a2a, #ff8a2a);
          color: #0b0b0d;
          font-weight: 600;
          letter-spacing: 0.8px;
          cursor: pointer;
          box-shadow:
            0 0 18px rgba(255, 0, 0, 0.6),
            0 0 26px rgba(255, 138, 42, 0.5);
          transition: 0.18s ease;
        }

        .generate-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .generate-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow:
            0 0 24px rgba(255, 0, 0, 0.8),
            0 0 32px rgba(255, 138, 42, 0.7);
        }

        .error-section {
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(248, 113, 113, 0.7);
        }

        .error-text {
          margin: 0;
          font-size: 0.85rem;
          color: #fca5a5;
        }

        .output-section img {
          max-width: 100%;
          border-radius: 12px;
          margin-top: 10px;
          box-shadow: 0 0 18px rgba(0, 0, 0, 0.7);
        }

        .output-section pre {
          background: rgba(5, 5, 8, 0.95);
          padding: 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          overflow-x: auto;
          font-size: 0.8rem;
        }

        .upload-thumb-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .upload-thumb {
          position: relative;
          width: 84px;
          height: 84px;
          flex-shrink: 0;
        }

        .upload-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          display: block;
        }

        .upload-thumb-remove {
          position: absolute;
          top: -7px;
          right: -7px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          background: rgba(220, 38, 38, 0.9);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          padding: 0;
          box-shadow: 0 0 6px rgba(0,0,0,0.5);
        }

        .upload-thumb-remove:hover {
          background: #dc2626;
          transform: scale(1.15);
        }

        .upload-thumb-label {
          position: absolute;
          bottom: 4px;
          left: 4px;
          font-size: 0.62rem;
          font-weight: 600;
          color: #fff;
          background: rgba(0,0,0,0.55);
          border-radius: 4px;
          padding: 1px 4px;
        }

        @media (max-width: 768px) {
          .glass-shell {
            padding: 18px 14px 22px;
          }

          .category-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .nsfw-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
