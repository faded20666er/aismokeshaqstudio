// pages/api/elevenlabs-voices.js
//
// Searches ElevenLabs' real SHARED VOICE LIBRARY — the actual
// community catalog of 10,000+ voices — via GET /v1/shared-voices.
//
// IMPORTANT: this used to call GET /v2/voices, which only returns
// voices already saved to the calling account's own personal voice
// list (a small, fixed handful) — NOT the full community library.
// That's why the picker only ever showed ~11 voices despite the code
// comment claiming "thousands of voices." Fixed by switching to the
// real shared-voices endpoint, confirmed via ElevenLabs' own API docs
// (elevenlabs.io/docs/api-reference/voices/voice-library/get-shared).
//
// ElevenLabs' docs note Voice Library access isn't available via API
// to free-tier accounts — since this app's calls go through a paid
// platform account (or the user's own BYOK key for Pro/Premium), this
// should work, but if ATLASCLOUD_API_KEY-style "free tier" limits ever
// apply to the shared key, this is the first place that would surface.
//
// If the user (a Pro/Premium subscriber) has saved their own ElevenLabs
// key via /api/byok-key, we use THEIR key here — meaning they search
// their own plan's library access at zero cost to us.

import { getByokKey } from "../../middleware/byokStore.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      search = "",
      gender,
      age,
      accent,
      language,
      category, // "professional" | "famous" | "high_quality"
      sort = "trending",
      page_size = "30",
      page = "0",
      userId,
    } = req.query;

    const byokKey = userId ? await getByokKey(userId, "elevenlabs") : null;
    const apiKey = byokKey || process.env.ELEVENLABS_API_KEY;

    const params = new URLSearchParams({
      page_size: String(page_size),
      page: String(page),
      sort,
    });

    if (search) params.set("search", search);
    if (gender) params.set("gender", gender);
    if (age) params.set("age", age);
    if (accent) params.set("accent", accent);
    if (language) params.set("language", language);
    if (category) params.set("category", category);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/shared-voices?${params.toString()}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`ElevenLabs error (${response.status}): ${text || response.statusText}`);
    }

    const data = await response.json();

    // Normalize to just what the frontend needs. Note the shared-voices
    // response shape is different from /v2/voices — fields like
    // "accent", "gender", "age" are top-level here, not nested under
    // "labels" like the old endpoint. free_users_allowed and
    // cloned_by_count are unique to this endpoint and useful for
    // sorting/filtering quality in the picker UI.
    const voices = (data.voices || []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      gender: v.gender || "unspecified",
      age: v.age || null,
      accent: v.accent || null,
      language: v.language || null,
      useCase: v.use_case || null,
      description: v.description || null,
      previewUrl: v.preview_url || null,
      category: v.category || null,
      freeUsersAllowed: v.free_users_allowed ?? true,
      clonedByCount: v.cloned_by_count || 0,
    }));

    return res.status(200).json({
      voices,
      hasMore: data.has_more || false,
      totalCount: data.total_count || voices.length,
      usingOwnKey: !!byokKey,
    });
  } catch (err) {
    console.error("elevenlabs-voices.js error:", err);
    return res.status(500).json({
      error: "Failed to fetch voices",
      details: err.message,
    });
  }
}
