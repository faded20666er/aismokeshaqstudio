// pages/history.jsx
//
// "Where are my images?" — the generation history/gallery page. Shows
// every past image/video/TTS/lipsync/timeline output, newest first,
// with category filters and a delete option. Backed by
// middleware/historyStore.js (Redis), which started recording
// generations this session — anything generated BEFORE this feature
// shipped won't appear here, since there was nowhere for it to be
// recorded until now.

import { useEffect, useState } from "react";
import { useAppUserId } from "../utils/useAppUserId";

const CATEGORY_TABS = [
  { value: "", label: "All" },
  { value: "image", label: "Image" },
  { value: "image-nsfw", label: "Image (NSFW)" },
  { value: "video", label: "Video" },
  { value: "tts", label: "TTS" },
  { value: "lipsync", label: "Talking Photo" },
  { value: "timeline", label: "Timeline" },
];

export default function HistoryPage() {
  const { userId, isReady } = useAppUserId();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    if (!isReady || !userId) return;
    loadHistory();
  }, [isReady, userId, activeCategory]);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ userId, limit: "100" });
      if (activeCategory) params.set("category", activeCategory);

      const res = await fetch(`/api/history?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load history");

      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(itemId) {
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, itemId }),
      });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      if (previewItem?.id === itemId) setPreviewItem(null);
    } catch {
      // Non-critical — leave the item in place if delete fails, user can retry.
    }
  }

  function isVideo(item) {
    return item.category === "video" || item.category === "lipsync" || item.category === "timeline";
  }

  function isAudio(item) {
    return item.category === "tts";
  }

  return (
    <div className="studio-root">
      <div className="studio-layout">
        <div className="panel-root history-page">
          <div className="panel-gold-bar" />
          <div className="panel-header">
            <h1>Your Generations</h1>
            <p>Everything you've created, in one place.</p>
            <a href="/studio" className="panel-link">
              ← Back to Studio
            </a>
          </div>

          <div className="history-tabs">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`history-tab ${activeCategory === tab.value ? "active" : ""}`}
                onClick={() => setActiveCategory(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && <p className="history-status">Loading…</p>}
          {error && <div className="panel-error">{error}</div>}

          {!loading && !error && items.length === 0 && (
            <p className="history-status">
              Nothing here yet. Generations you create from now on will show up
              here — past generations made before this page existed weren't
              recorded.
            </p>
          )}

          <div className="history-grid">
            {items.map((item) => (
              <div key={item.id} className="history-card">
                <button
                  type="button"
                  className="history-card-media-btn"
                  onClick={() => setPreviewItem(item)}
                >
                  {isVideo(item) ? (
                    <video src={item.output} className="history-card-media" muted />
                  ) : isAudio(item) ? (
                    <div className="history-card-audio-icon">🎵</div>
                  ) : (
                    <img src={item.output} alt={item.modelName} className="history-card-media" />
                  )}
                </button>

                <div className="history-card-meta">
                  <span className="history-card-model">{item.modelName}</span>
                  <span className="history-card-date">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="history-card-actions">
                  <a href={item.output} download className="history-card-download">
                    Download
                  </a>
                  <button
                    type="button"
                    className="history-card-delete"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {previewItem && (
        <div className="history-preview-overlay" onClick={() => setPreviewItem(null)}>
          <div className="history-preview-card" onClick={(e) => e.stopPropagation()}>
            {isVideo(previewItem) ? (
              <video src={previewItem.output} className="history-preview-media" controls autoPlay />
            ) : isAudio(previewItem) ? (
              <audio src={previewItem.output} controls autoPlay />
            ) : (
              <img src={previewItem.output} alt={previewItem.modelName} className="history-preview-media" />
            )}
            {previewItem.prompt && <p className="history-preview-prompt">"{previewItem.prompt}"</p>}
            <button type="button" className="history-preview-close" onClick={() => setPreviewItem(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .history-page {
          max-width: 1200px;
        }

        .history-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 18px 0;
        }

        .history-tab {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.05);
          color: #d9d9d9;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .history-tab.active {
          background: linear-gradient(135deg, #c9a227, #f3d98b);
          color: #0b0b0d;
          font-weight: 600;
          border-color: transparent;
        }

        .history-status {
          font-size: 0.9rem;
          opacity: 0.7;
          padding: 24px 0;
        }

        .history-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .history-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          overflow: hidden;
        }

        .history-card-media-btn {
          width: 100%;
          padding: 0;
          border: none;
          background: rgba(0, 0, 0, 0.4);
          cursor: pointer;
          display: block;
        }

        .history-card-media {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
        }

        .history-card-audio-icon {
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
        }

        .history-card-meta {
          display: flex;
          justify-content: space-between;
          padding: 8px 10px 4px;
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .history-card-actions {
          display: flex;
          justify-content: space-between;
          padding: 4px 10px 10px;
          gap: 8px;
        }

        .history-card-download,
        .history-card-delete {
          font-size: 0.72rem;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.05);
          color: #d9d9d9;
          cursor: pointer;
          text-decoration: none;
        }

        .history-card-delete {
          color: #fca5a5;
        }

        .history-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .history-preview-card {
          max-width: 720px;
          width: 100%;
          background: rgba(10, 10, 18, 0.95);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }

        .history-preview-media {
          max-width: 100%;
          max-height: 70vh;
          border-radius: 10px;
        }

        .history-preview-prompt {
          margin-top: 12px;
          font-size: 0.85rem;
          opacity: 0.75;
          font-style: italic;
        }

        .history-preview-close {
          margin-top: 14px;
          padding: 8px 20px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          color: #d9d9d9;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
