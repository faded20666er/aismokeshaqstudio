// pages/api/characters.js
//
// The Character Library — GET lists a user's saved {name, voice}
// characters, POST saves/updates one (upsert by id), DELETE removes
// one. Backs the "load saved character" picker in CharacterTagger.jsx
// and the "Save to Library" button in DialogueTimeline.jsx. See
// middleware/characterStore.js for why this exists and how it's
// stored.

import { saveCharacter, getCharacters, deleteCharacter } from "../../middleware/characterStore.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const characters = await getCharacters(userId);
      return res.status(200).json({ characters });
    }

    if (req.method === "POST") {
      const { userId, character } = req.body || {};

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }
      if (!character?.name) {
        return res.status(400).json({ error: "Missing character name" });
      }

      const saved = await saveCharacter(userId, character);
      return res.status(200).json({ character: saved });
    }

    if (req.method === "DELETE") {
      const { userId, characterId } = req.body || {};

      if (!userId || !characterId) {
        return res.status(400).json({ error: "Missing userId or characterId" });
      }

      const deleted = await deleteCharacter(userId, characterId);
      return res.status(200).json({ success: deleted });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("characters.js error:", err);
    return res.status(500).json({
      error: "Failed to save character",
      details: err.message,
    });
  }
}
