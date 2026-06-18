// AISmokeShaqStudio/components/ModelSelector.jsx

import { useEffect, useState } from "react";
import { getDropdownModels } from "../utils/modelDropdown";

export default function ModelSelector({ category, nsfwEnabled, onSelect }) {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const dropdown = getDropdownModels(nsfwEnabled);
    setGroups(dropdown[category] || []);
  }, [category, nsfwEnabled]);

  return (
    <div className="model-selector">
      {groups.map((group) => (
        <div key={group.provider} className="provider-group">
          <h3 className="provider-title">{group.provider}</h3>

          <div className="model-list">
            {group.models.map((model) => {
              const locked = model.locked;

              return (
                <button
                  key={model.id}
                  className={`model-btn ${locked ? "locked" : ""}`}
                  disabled={locked}
                  onClick={() => !locked && onSelect(model)}
                >
                  <span className="model-name">{model.name}</span>

                  <span className="model-credits">
                    {model.credits} credits
                  </span>

                  {locked && (
                    <span className="model-lock">🔒 NSFW Locked</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <style jsx>{`
        .provider-group {
          margin-bottom: 24px;
        }

        .provider-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #fff;
        }

        .model-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .model-btn {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-radius: 8px;
          background: #1a1a1a;
          color: #fff;
          border: 1px solid #333;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .model-btn:hover {
          background: #222;
          border-color: #444;
        }

        .model-btn.locked {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .model-name {
          font-size: 0.95rem;
        }

        .model-credits {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        .model-lock {
          margin-left: 10px;
          font-size: 0.85rem;
          color: #ff6b6b;
        }
      `}</style>
    </div>
  );
}
