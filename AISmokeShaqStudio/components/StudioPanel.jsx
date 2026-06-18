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
      userId: "demo-user", // Replace with real auth later
      nsfwEnabled,
      inputs: {
        prompt,
      },
    };

    // Attach file if present
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

  return (
    <div className="studio-panel">
      {/* CATEGORY TABS */}
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

      {/* NSFW TOGGLE */}
      <div className="nsfw-toggle">
        <label>
          <input
            type="checkbox"
            checked={nsfwEnabled}
            onChange={(e) => setNsfwEnabled(e.target.checked)}
          />
          Enable NSFW Models
        </label>
      </div>

      {/* MODEL SELECTOR */}
      <ModelSelector
        category={category}
        nsfwEnabled={nsfwEnabled}
        onSelect={(m) => setSelectedModel(m)}
      />

      {/* PROMPT INPUT */}
      {category !== "tts" && (
        <textarea
          className="prompt-box"
          placeholder="Enter your prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      )}

      {/* FILE UPLOAD */}
      {(category === "image" || category === "video" || category === "lipsync") && (
        <input
          type="file"
          className="file-input"
          onChange={(e) => setFile(e.target.files[0])}
        />
      )}

      {/* GENERATE BUTTON */}
      <button
        className="generate-btn"
        disabled={!selectedModel || loading}
        onClick={handleGenerate}
      >
        {loading ? "Generating..." : "Generate"}
      </button>

      {/* OUTPUT */}
      {output && (
        <div className="output-section">
          <h3>Output</h3>

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
          ) : (
            <pre>{JSON.stringify(output, null, 2)}</pre>
          )}
        </div>
      )}

      <style jsx>{`
        .studio-panel {
          padding: 20px;
          color: #fff;
        }

        .category-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .tab-btn {
          padding: 8px 14px;
          border-radius: 6px;
          background: #1a1a1a;
          border: 1px solid #333;
          cursor: pointer;
        }

        .tab-btn.active {
          background: #333;
          border-color: #555;
        }

        .nsfw-toggle {
          margin-bottom: 20px;
        }

        .prompt-box {
          width: 100%;
          height: 100px;
          background: #111;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 20px;
          color: #fff;
        }

        .file-input {
          margin-bottom: 20px;
        }

        .generate-btn {
          width: 100%;
          padding: 12px;
          background: #4a4a4a;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 20px;
        }

        .output-section img {
          max-width: 100%;
          border-radius: 8px;
          margin-top: 10px;
        }

        .output-section pre {
          background: #111;
          padding: 10px;
          border-radius: 6px;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
