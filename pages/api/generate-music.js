// pages/api/generate-music.js
// Uses Meta MusicGen via Replicate
import Replicate from 'replicate';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, duration = 15 } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: 'Replicate API token not configured' });
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // MusicGen stereo-large — best quality freely available model
    const output = await replicate.run(
      'meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043399421d6d8962a4cabbed0a2b',
      {
        input: {
          prompt:                 prompt.trim(),
          duration:               Math.min(Math.max(Number(duration), 5), 90),
          model_version:          'stereo-large',
          output_format:          'mp3',
          normalization_strategy: 'peak',
          top_k:                  250,
          top_p:                  0,
          temperature:            1,
          classifier_free_guidance: 3,
        },
      }
    );

    // output is a URL string from Replicate
    const url = Array.isArray(output) ? output[0] : String(output);

    // TODO: deduct credits from authenticated user
    // MusicGen cost: ~$0.0072/sec — apply the 2.5× markup formula

    return res.status(200).json({ url });

  } catch (err) {
    console.error('Music generation error:', err);
    return res.status(500).json({ error: err.message || 'Music generation failed' });
  }
}
