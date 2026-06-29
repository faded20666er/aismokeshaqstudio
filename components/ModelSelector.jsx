// components/ModelSelector.jsx
//
// A real <select> dropdown, sorted most-expensive/highest-quality
// first. Replaces the old version which rendered every model as a
// button in a long, fragmented, provider-grouped list. The selected
// model's strength description shows below the dropdown so customers
// can choose wisely based on what they're trying to make, not just
// price or a name they recognize.

import { useEffect, useState } from "react";
import { getDropdownModels } from "../utils/modelDropdown";

export default function ModelSelector({ category, nsfwEnabled, onSelect }) {
  const [models, setModels] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const dropdown = getDropdownModels(nsfwEnabled);
    const list = dropdown[category] || [];
    setModels(list);

    // Default to the first unlocked model whenever the category or
    // NSFW toggle changes, so there's always a sensible selection.
    const firstAvailable = list.find((m) => !m.locked);
    if (firstAvailable) {
      setSelectedId(firstAvailable.id);
      onSelect(firstAvailable);
    } else {
      setSelectedId("");
    }
  }, [category, nsfwEnabled]);

  const selectedModel = models.find((m) => m.id === selectedId);

  function handleChange(e) {
    const id = e.target.value;
    setSelectedId(id);
    const model = models.find((m) => m.id === id);
    if (model && !model.locked) onSelect(model);
  }

  return (
    <div className="model-selector">
      <select className="model-select" value={selectedId} onChange={handleChange}>
        {models.map((model) => (
          <option key={model.id} value={model.id} disabled={model.locked}>
            {model.locked ? "🔒 " : ""}
            {model.name} — {model.credits} credit{model.credits === 1 ? "" : "s"}
            {model.premium ? " ★" : ""}
          </option>
        ))}
      </select>

      {selectedModel && (
        <p className="model-description">
          {selectedModel.locked
            ? "Unlock NSFW mode to use this model."
            : selectedModel.description}
        </p>
      )}

      <style jsx>{`
        .model-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .model-select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: #1a1a1a;
          color: #fff;
          border: 1px solid #333;
          font-size: 0.95rem;
          cursor: pointer;
        }

        .model-select:focus {
          border-color: #ff8a2a;
          outline: none;
        }

        .model-description {
          font-size: 0.82rem;
          opacity: 0.75;
          margin: 0;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
