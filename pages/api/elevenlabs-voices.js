// pages/api/elevenlabs-voices.js
//
// Two voice sources, picked automatically based on which API key is in
// play:
//
// 1. BYOK (Pro/Premium user's own ElevenLabs key, saved via
//    /api/byok-key) -> GET /v1/shared-voices, the full searchable
//    community library (10,000+ voices). Whatever that user's own
//    ElevenLabs plan allows is what they get -- their plan, their cost.
//
// 2. No BYOK key (free-tier users, riding the platform's shared
//    ELEVENLABS_API_KEY) -> GET /v1/voices instead. /v1/shared-voices
//    flat-out 402s for free-tier keys ("Free users cannot use library
//    voices via the API"); confirmed against ElevenLabs' own docs that
//    this restriction is specifically on the *shared* library, not on
//    /v1/voices. /v1/voices returns the calling account's own voice
//    list, which every account -- including a brand-new free one --
//    ships with ElevenLabs' full set of default "premade" voices
//    already added (~20+, spanning gender/age/accent). Those ARE
//    usable for real text-to-speech via the API on a free key. This is
//    the actual fix for the recurring 402 during Timeline generation:
//    it was never about which key was selected, it was about which
//    endpoint/voice source was being hit. Switching the free path off
//    /v1/shared-voices entirely removes the chance of a free user ever
//    picking a voice that 402s.
//
// /v1/voices doesn't support server-side search/gender/category query
// params the way /v1/shared-voices does (it's just "list my voices"),
// so for that path we fetch the full list once and filter in JS.

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

    // --- Path 2: no BYOK key -- free-tier-safe own-voice list ---
    if (!byokKey) {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": apiKey },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`ElevenLabs error (${response.status}): ${text || response.statusText}`);
      }

      const data = await response.json();

      let voices = (data.voices || []).map((v) => ({
        id: v.voice_id,
        name: v.name,
        gender: v.labels?.gender || "unspecified",
        age: v.labels?.age || null,
        accent: v.labels?.accent || null,
        language: null,
        useCase: v.labels?.use_case || null,
        description: v.description || v.labels?.descriptive || null,
        previewUrl: v.preview_url || null,
        category: v.category || null,
        freeUsersAllowed: true, // these are the account's own voices -- always usable
        clonedByCount: 0,
      }));

      const searchLower = search.toLowerCase().trim();
      if (searchLower) {
        voices = voices.filter(
          (v) =>
            v.name.toLowerCase().includes(searchLower) ||
            (v.useCase || "").toLowerCase().includes(searchLower) ||
            (v.description || "").toLowerCase().includes(searchLower)
        );
      }
      if (gender) voices = voices.filter((v) => v.gender === gender);
      if (age) voices = voices.filter((v) => v.age === age);
      if (accent) voices = voices.filter((v) => v.accent === accent);
      if (category) voices = voices.filter((v) => v.category === category);

      return res.status(200).json({
        voices,
        hasMore: false,
        totalCount: voices.length,
        usingOwnKey: false,
        source: "account-voices", // lets the picker UI label this set if useful
      });
    }

    // --- Path 1: BYOK key -- full community library search ---
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
    // response shape is different from /v1/voices -- fields like
    // "accent", "gender", "age" are top-level here, not nested under
    // "labels" like the account-voices endpoint. free_users_allowed and
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
      usingOwnKey: true,
      source: "shared-library",
    });
  } catch (err) {
    console.error("elevenlabs-voices.js error:", err);
    return res.status(500).json({
      error: "Failed to fetch voices",
      details: err.message,
    });
  }
}
