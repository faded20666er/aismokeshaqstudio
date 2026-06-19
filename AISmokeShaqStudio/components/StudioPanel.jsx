// AISmokeShaqStudio/components/StudioPanel.jsx

import { useState } from "react";
import ModelSelector from "./ModelSelector";

export default function StudioPanel() {
  const [category, setCategory] = useState("image");
  const [selectedModel, setSelectedModel] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nsfwEnabled, setNsfwEnabled] = useState(false);

  async function handleGenerate() {
    if (!selectedModel) return;

    setLoading(true);
    setOutput(null);

    const formData = {
      modelId: selectedModel.id,
      userId: "demo-user",
      nsfwEnabled,
      inputs: {
        prompt,
      },
    };

    if (file) {
      formData.inputs.image = file;
    }

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    setLoading(false);

    if (data.output) {
      setOutput(data.output);
    }
  }

  const categoryLabel = {
    image: "Image Generation",
    video: "Video / Animation",
    lipsync: "Lipsync Studio",
    tts: "Voice / TTS",
  }[category];

  return (
    <div className="studio-panel glass-shell">
      {/* CATEGORY TABS */}
      <div className="category-header">
        <span className="section-label text-silver-red">Mode</span>
        <div className="category-tabs">
          {["image", "video", "lipsync", "tts"].map((cat) => (
            <button
              key={cat}
              className={`tab-btn ${category === cat ? "active" : ""}`}
              onClick={() => {
                setCategory(cat);
                setSelectedModel(null);
                setOutput(null);
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <p className="category-subtitle">{categoryLabel}</p>

      {/* NSFW TOGGLE */}
      <div className="nsfw-row">
        <label className="nsfw-toggle">
          <input
            type="checkbox"
            checked={nsfwEnabled}
            onChange={(e) => setNsfwEnabled(e.target.checked)}
          />
          <span className="nsfw-label text-silver-red">Enable NSFW Models</span>
        </label>
        <span className="nsfw-note">Locked models show a 🔒 until NSFW is enabled.</span>
      </div>

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

      {/* PROMPT INPUT */}
      {category !== "tts" && (
        <div className="section-block">
          <div className="section-header">
            <span className="section-label text-silver-red">Prompt</span>
          </div>
          <textarea
            className="prompt-box"
            placeholder="Describe the scene, style, mood, or script you want to create..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
      )}

      {/* FILE UPLOAD */}
      {(category === "image" || category === "video" || category === "lipsync") && (
        <div className="section-block">
          <div className="section-header">
            <span className="section-label text-silver-red">Upload</span>
            <span className="section-meta">
              {category === "image" && "Optional reference image"}
              {category === "video" && "Optional source clip"}
              {category === "lipsync" && "Face image or character frame"}
            </span>
          </div>
          <input
            type="file"
            className="file-input"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
      )}

      {/* GENERATE BUTTON */}
      <div className="section-block">
        <button
          className="generate-btn"
          disabled={!selectedModel || loading}
          onClick={handleGenerate}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* OUTPUT */}
      {output && (
        <div className="section-block output-section">
          <div className="section-header">
            <span className="section-label text-silver-red">Output</span>
          </div>

          {Array.isArray(output) ? (
            output.map((item, i) => (
              <div key={i} className="output-item">
                {typeof item === "string" && item.startsWith("http") ? (
                  <img src={item} alt="output" />
                ) : (
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                )}
              </div>
            ))
          ) : typeof output === "string" && output.startsWith("http") ? (
            <img src={output} alt="output" />
          ) : (
            <pre>{JSON.stringify(output, null, 2)}</pre>
          )}
        </div>
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
