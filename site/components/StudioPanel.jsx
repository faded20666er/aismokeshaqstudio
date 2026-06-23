// components/StudioPanel.jsx
// StudioPanel no longer owns its own fetch/generate logic. Previously
// BOTH this component and pages/studio.jsx independently called
// /api/generate with their own copies of loading/error/output state —
// they fought over the same responsibility and only one was ever
// actually wired to the visible UI. Now studio.jsx owns the network
// call and passes everything down as props, so there's exactly one
// source of truth.

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import ModelSelector from "./ModelSelector";
import VoicePicker from "./VoicePicker";
import AuthButtons from "./AuthButtons";

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

export default function StudioPanel({ onGenerate, loading, error, credits, output }) {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user?.id);

  const [category, setCategory] = useState("image");
  const [selectedModel, setSelectedModel] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState(null);
  const [faceFile, setFaceFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [nsfwEnabled, setNsfwEnabled] = useState(false);

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleGenerateClick() {
    if (!selectedModel) return;

    // If the user is not authenticated, prompt them to sign in instead
    if (!isAuthenticated) {
      signIn();
      return;
    }

    const inputs = { prompt };

    if (file) {
      inputs.image = await fileToDataUrl(file);
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
        </>
      )}

      {/* VOICE PICKER (ElevenLabs only — live search of their real library) */}
      {category === "tts" && selectedModel?.id?.startsWith("elevenlabs/") && (
        <div className="section-block">
          <div className="section-header">
            <span className="section-label text-silver-red">Voice</span>
            {selectedVoice && (
              <span className="section-meta">{selectedVoice.name}</span>
            )}
          </div>
          <VoicePicker onSelect={(v) => setSelectedVoice(v)} />
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
      {(category === "image" || category === "video") && (
        <div className="section-block">
          <div className="section-header">
            <span className="section-label text-silver-red">Upload</span>
            <span className="section-meta">
              {category === "image" && "Optional reference image"}
              {category === "video" && "Optional source clip"}
            </span>
          </div>
          <input
            type="file"
            className="file-input"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
      )}

      {/* CREDITS */}
      {typeof credits === "number" && (
        <div className="section-block">
          <span className="section-meta">Credits remaining: {credits}</span>
        </div>
      )}

      {/* SIGN IN CTA FOR UNAUTHENTICATED USERS */}
      {!isAuthenticated && (
        <div className="section-block">
          <div className="section-header">
            <span className="section-label text-silver-red">Sign in to generate</span>
            <span className="section-meta">Verified emails receive 45 free credits</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <AuthButtons />
          </div>
        </div>
      )}

      {/* GENERATE BUTTON */}
      <div className="section-block">
        <button
          className="generate-btn"
          disabled={!selectedModel || loading || !isAuthenticated}
          onClick={handleGenerateClick}
        >
          {loading ? "Generating..." : "Generate"}
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

      <style jsx>{`...`}</style>
    </div>
  );
}
