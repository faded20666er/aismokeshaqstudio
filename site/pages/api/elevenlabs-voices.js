// pages/api/elevenlabs-voices.js
//
// Searches ElevenLabs' real voice library directly through their API.
// This is what makes the voice picker show ElevenLabs' actual full
// catalog (thousands of community + professional voices) instead of a
// small hardcoded list — the whole point of beating competitors who
// only offer a dozen or so fixed voices.
//
// Docs: https://elevenlabs.io/docs/api-reference/voices/search

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { search = "", gender, page_size = "30" } = req.query;

    const params = new URLSearchParams({
      page_size: String(page_size),
    });

    if (search) params.set("search", search);
    if (gender) params.set("gender", gender);

    const response = await fetch(
      `https://api.elevenlabs.io/v2/voices?${params.toString()}`,
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`ElevenLabs error (${response.status}): ${text || response.statusText}`);
    }

    const data = await response.json();

    // Normalize to just what the frontend needs, so we're not locked
    // to ElevenLabs' exact response shape everywhere downstream.
    const voices = (data.voices || []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender || "unspecified",
      accent: v.labels?.accent || null,
      useCase: v.labels?.use_case || null,
      description: v.labels?.description || null,
      previewUrl: v.preview_url || null,
    }));

    return res.status(200).json({ voices });
  } catch (err) {
    console.error("elevenlabs-voices.js error:", err);
    return res.status(500).json({
      error: "Failed to fetch voices",
      details: err.message,
    });
  }
}
