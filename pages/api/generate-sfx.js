// pages/api/generate-sfx.js
// Uses ElevenLabs Sound Generation API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, duration = 3 } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key':   process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text:              prompt.trim(),
        duration_seconds:  Math.min(Math.max(Number(duration), 0.5), 22),
        prompt_influence:  0.3,
      }),
    });

    if (!response.ok) {
      // Try to parse error body
      let msg = `ElevenLabs error ${response.status}`;
      try {
        const errBody = await response.json();
        msg = errBody?.detail?.message || errBody?.detail || msg;
      } catch {}
      throw new Error(msg);
    }

    // ElevenLabs returns raw audio bytes (mp3)
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64}`;

    // TODO: deduct credits from authenticated user

    return res.status(200).json({ url: dataUrl });

  } catch (err) {
    console.error('SFX generation error:', err);
    return res.status(500).json({ error: err.message || 'Sound generation failed' });
  }
}
