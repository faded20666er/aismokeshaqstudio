// middleware/characterStore.js
//
// A per-user "Character Library" — saved {name, voice} pairs the
// Multi-Character Timeline can recall instantly instead of re-tagging
// and re-picking a voice every time the same recurring character shows
// up in a new scene. Direct answer to the recurring pain: a character's
// bounding BOX is inherently scene-specific (it's a region of THIS
// photo/video), but their NAME and VOICE are not — this store persists
// just that reusable identity, decoupled from any one scene.
//
// Stored as a Redis HASH per user (characters:<userId>), field =
// character id, value = JSON-encoded {id, name, voice, updatedAt}.
// A hash (not the LIST pattern historyStore.js uses) because this
// needs real update-by-id and delete-by-id — a library entry gets
// edited in place (re-saving a character just overwrites its own
// field) rather than only ever appended, and a small hash of maybe a
// few dozen entries per user has no need for historyStore's count-cap/
// LTRIM machinery.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CHAR_KEY = (userId) => `characters:${userId}`;

// Upsert: pass an existing id to update that saved character in place
// (e.g. re-saving after picking a different voice for the same
// library entry); omit id to create a new one. Returns the saved
// record, including its id — the caller (CharacterTagger/DialogueTimeline)
// stamps this back onto the in-timeline character as `libraryId` so a
// second save updates rather than duplicates.
export async function saveCharacter(userId, character) {
  if (!userId) throw new Error("Missing userId");
  if (!character?.name?.trim()) throw new Error("Missing character name");

  const id = character.id || (crypto.randomUUID ? crypto.randomUUID() : `char-${Date.now()}`);
  const entry = {
    id,
    name: character.name.trim(),
    // voice: {id, name, ...} from VoicePicker.jsx's real ElevenLabs
    // voice object, or null if this character has no voice saved yet.
    voice: character.voice || null,
    updatedAt: Date.now(),
  };

  await redis.hset(CHAR_KEY(userId), { [id]: JSON.stringify(entry) });
  return entry;
}

export async function getCharacters(userId) {
  if (!userId) return [];

  try {
    const all = await redis.hgetall(CHAR_KEY(userId));
    if (!all) return [];

    return Object.values(all)
      .map((v) => {
        try {
          return typeof v === "string" ? JSON.parse(v) : v;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); // most recently saved first
  } catch (err) {
    console.error("characterStore.js: failed to read characters:", err.message);
    return [];
  }
}

export async function deleteCharacter(userId, characterId) {
  if (!userId || !characterId) return false;
  await redis.hdel(CHAR_KEY(userId), characterId);
  return true;
}
