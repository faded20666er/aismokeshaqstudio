#!/usr/bin/env python3
"""One-shot script to strip the NSFW toggle/AgeGate wiring out of
components/StudioPanel.jsx and components/ModelSelector.jsx. Mirrors the
edits already verified (build-tested) in the cloud sandbox copy of this
repo. Run from the repo root: python3 scripts/apply_nsfw_removal.py
"""
import sys

def apply_edits(path, edits):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for i, (old, new) in enumerate(edits):
        count = content.count(old)
        if count != 1:
            print(f"FAIL: edit {i} in {path} matched {count} times (expected 1)")
            sys.exit(1)
        content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: applied {len(edits)} edits to {path}")

STUDIO_EDITS = [
    (
        'import ByokKeyManager from "./ByokKeyManager";\nimport AgeGate from "./AgeGate";',
        'import ByokKeyManager from "./ByokKeyManager";',
    ),
    (
        '  const [usingOwnKey, setUsingOwnKey] = useState(false);\n'
        '  const [nsfwEnabled, setNsfwEnabled] = useState(false);\n'
        '  const [nsfwAgeVerified, setNsfwAgeVerified] = useState(false);\n'
        '  const [showNsfwAgeGate, setShowNsfwAgeGate] = useState(false);\n'
        '\n'
        '  // Check if user has already completed NSFW age verification on this browser\n'
        '  // (runs once on mount — skips the gate for returning users who already agreed)\n'
        '  useEffect(() => {\n'
        '    try {\n'
        '      if (window.localStorage.getItem("smokeshaq_nsfw_age_verified") === "true") {\n'
        '        setNsfwAgeVerified(true);\n'
        '      }\n'
        '    } catch {\n'
        '      // localStorage unavailable — gate will show every session, which is the safe default\n'
        '    }\n'
        '  }, []);\n'
        '\n'
        '  // Reset video duration selection',
        '  const [usingOwnKey, setUsingOwnKey] = useState(false);\n'
        '\n'
        '  // Reset video duration selection',
    ),
    (
        '  function handleNsfwToggle(enabling) {\n'
        '    if (enabling && !nsfwAgeVerified) {\n'
        '      // User wants to turn on NSFW but hasn\'t verified age yet — show the gate\n'
        '      setShowNsfwAgeGate(true);\n'
        '      return;\n'
        '    }\n'
        '    setNsfwEnabled(enabling);\n'
        '  }\n'
        '\n'
        '  function handleNsfwVerified() {\n'
        '    try {\n'
        '      window.localStorage.setItem("smokeshaq_nsfw_age_verified", "true");\n'
        '    } catch {}\n'
        '    setNsfwAgeVerified(true);\n'
        '    setNsfwEnabled(true);\n'
        '    setShowNsfwAgeGate(false);\n'
        '  }\n'
        '\n'
        '  function handleNsfwDeclined() {\n'
        '    setShowNsfwAgeGate(false);\n'
        '    // Don\'t change nsfwEnabled — if it was off, it stays off\n'
        '  }\n'
        '\n'
        '  async function handleGenerateClick() {',
        '  async function handleGenerateClick() {',
    ),
    (
        '    await onGenerate({\n'
        '      category,\n'
        '      modelId: selectedModel.id,\n'
        '      nsfwEnabled,\n'
        '      inputs,\n'
        '    });',
        '    await onGenerate({\n'
        '      category,\n'
        '      modelId: selectedModel.id,\n'
        '      inputs,\n'
        '    });',
    ),
    (
        '        <ModelSelector\n'
        '          category={category}\n'
        '          nsfwEnabled={nsfwEnabled}\n'
        '          onSelect={(m) => setSelectedModel(m)}\n'
        '        />',
        '        <ModelSelector\n'
        '          category={category}\n'
        '          onSelect={(m) => setSelectedModel(m)}\n'
        '        />',
    ),
    (
        '      {/* NSFW TOGGLE — moved to bottom; hidden for TTS (no NSFW voice models exist) */}\n'
        '      {category !== "tts" && (\n'
        '        <div className="nsfw-row">\n'
        '          <label className="nsfw-toggle">\n'
        '            <input\n'
        '              type="checkbox"\n'
        '              checked={nsfwEnabled}\n'
        '              onChange={(e) => handleNsfwToggle(e.target.checked)}\n'
        '            />\n'
        '            <span className="nsfw-label text-silver-red">Enable NSFW Models</span>\n'
        '          </label>\n'
        '          <span className="nsfw-note">Locked models show a 🔒 until NSFW is enabled. You must be 18+ to use this feature, and you are solely responsible for any content you upload or generate.</span>\n'
        '        </div>\n'
        '      )}\n'
        '\n'
        '      {/* CREDITS */}',
        '      {/* CREDITS */}',
    ),
    (
        '      {/* NSFW Age Gate — only shown when user tries to enable NSFW without prior verification */}\n'
        '      {showNsfwAgeGate && (\n'
        '        <AgeGate onConfirm={handleNsfwVerified} onDecline={handleNsfwDeclined} />\n'
        '      )}\n'
        '\n'
        '      <style jsx>{`',
        '      <style jsx>{`',
    ),
    (
        '        .nsfw-row {\n'
        '          display: flex;\n'
        '          justify-content: space-between;\n'
        '          align-items: center;\n'
        '          gap: 12px;\n'
        '          font-size: 0.8rem;\n'
        '        }\n'
        '\n'
        '        .nsfw-toggle {\n'
        '          display: flex;\n'
        '          align-items: center;\n'
        '          gap: 8px;\n'
        '          cursor: pointer;\n'
        '        }\n'
        '\n'
        '        .nsfw-toggle input {\n'
        '          accent-color: #ff2a2a;\n'
        '        }\n'
        '\n'
        '        .nsfw-note {\n'
        '          opacity: 0.7;\n'
        '          font-size: 0.75rem;\n'
        '        }\n'
        '\n'
        '        .section-block {',
        '        .section-block {',
    ),
    (
        '          .category-header {\n'
        '            flex-direction: column;\n'
        '            align-items: flex-start;\n'
        '          }\n'
        '\n'
        '          .nsfw-row {\n'
        '            flex-direction: column;\n'
        '            align-items: flex-start;\n'
        '          }\n'
        '        }',
        '          .category-header {\n'
        '            flex-direction: column;\n'
        '            align-items: flex-start;\n'
        '          }\n'
        '        }',
    ),
]

MODELSELECTOR_EDITS = [
    (
        'export default function ModelSelector({ category, nsfwEnabled, onSelect }) {\n'
        '  const [models, setModels] = useState([]);\n'
        '  const [selectedId, setSelectedId] = useState("");\n'
        '\n'
        '  useEffect(() => {\n'
        '    const dropdown = getDropdownModels(nsfwEnabled);\n'
        '    const list = dropdown[category] || [];\n'
        '    setModels(list);\n'
        '\n'
        '    // Default to the first model that\'s actually usable (not locked, not coming soon).\n'
        '    const firstAvailable = list.find((m) => !m.locked && !m.comingSoon);\n'
        '    if (firstAvailable) {\n'
        '      setSelectedId(firstAvailable.id);\n'
        '      onSelect(firstAvailable);\n'
        '    } else {\n'
        '      setSelectedId("");\n'
        '    }\n'
        '  }, [category, nsfwEnabled]);',
        'export default function ModelSelector({ category, onSelect }) {\n'
        '  const [models, setModels] = useState([]);\n'
        '  const [selectedId, setSelectedId] = useState("");\n'
        '\n'
        '  useEffect(() => {\n'
        '    const dropdown = getDropdownModels();\n'
        '    const list = dropdown[category] || [];\n'
        '    setModels(list);\n'
        '\n'
        '    // Default to the first model that\'s actually usable (not locked, not coming soon).\n'
        '    const firstAvailable = list.find((m) => !m.locked && !m.comingSoon);\n'
        '    if (firstAvailable) {\n'
        '      setSelectedId(firstAvailable.id);\n'
        '      onSelect(firstAvailable);\n'
        '    } else {\n'
        '      setSelectedId("");\n'
        '    }\n'
        '  }, [category]);',
    ),
]

apply_edits("components/StudioPanel.jsx", STUDIO_EDITS)
print("DONE")
