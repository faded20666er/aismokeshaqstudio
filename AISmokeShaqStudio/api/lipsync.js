export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb"
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      timeline,
      referenceVideo,
      characterAudio
    } = req.body;

    if (!timeline || !Array.isArray(timeline)) {
      return res.status(400).json({ error: "Missing or invalid timeline" });
    }

    // ===== LOG INPUT =====
    console.log("Received timeline with", timeline.length, "tracks");

    // ===== VALIDATE AUDIO =====
    if (!characterAudio || typeof characterAudio !== "object") {
      console.log("No character audio provided (TTS-only or silent blocks)");
    } else {
      console.log("Character audio keys:", Object.keys(characterAudio));
    }

    // ===== VALIDATE REFERENCE VIDEO =====
    if (!referenceVideo) {
      console.log("No reference video uploaded — generating from scratch");
    }

    // ===== PREPARE PAYLOAD FOR YOUR MODEL =====
    const payload = {
      timeline,
      referenceVideo,
      characterAudio
    };

    // ===== PLACEHOLDER: CALL YOUR LIPSYNC MODEL =====
    // Example:
    // const result = await replicate.run("your-model", { input: payload });

    // For now, return a mock output so the front-end works:
    const mockOutputUrl =
      "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

    return res.status(200).json({
      status: "processing",
      message: "Timeline received. Video generation started.",
      output: mockOutputUrl
    });

  } catch (err) {
    console.error("LIPSYNC API ERROR:", err);
    return res.status(500).json({ error: "Lipsync generation failed" });
  }
}
