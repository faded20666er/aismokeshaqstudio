// pages/api/generate-tattoo.js
import Replicate from 'replicate';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

const STYLE_PROMPTS = {
  blackwork:        'blackwork tattoo design, bold solid black ink, high contrast, crisp line work, white background',
  traditional:      'traditional American tattoo design, bold black outlines, classic limited color palette, vintage flash art style',
  'neo-traditional':'neo-traditional tattoo design, bold outlines, rich jewel-toned colors, illustrative decorative style',
  watercolor:       'watercolor tattoo design, flowing ink washes, painterly style, soft edges, no outline, vibrant colors bleeding together',
  geometric:        'geometric tattoo design, precise mathematical lines, sacred geometry, perfect symmetry, black ink only',
  tribal:           'tribal tattoo design, bold solid black organic patterns, Pacific Islander aesthetic, no shading fills',
  japanese:         'Japanese irezumi tattoo design, traditional Edo period style, bold outlines, waves koi cherry blossoms wind bars',
  'fine-line':      'fine line tattoo design, ultra-thin delicate lines, minimalist and precise, single needle style, black ink only',
  realism:          'photorealistic tattoo design, hyperrealistic portrait-quality shading, detailed rendering, black and grey',
  minimalist:       'minimalist tattoo design, single clean continuous line, simple elegant form, no fill, small scale',
  dotwork:          'dotwork stippling tattoo design, built entirely from dots, mandala-inspired, intricate point work shading',
  biomechanical:    'biomechanical tattoo design, flesh merged with metal gears, cyberpunk anatomy, chrome mechanical parts',
  chicano:          'Chicano tattoo design, black and grey realism, fine shading, Our Lady of Guadalupe roses lettering style',
  'old-school':     'old school flash tattoo design, thick bold outlines, solid primary colors, sailor jerry style, anchors roses eagles',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ error: 'Could not parse form data' });
  }

  const prompt    = fields.prompt?.[0]?.trim() || '';
  const style     = fields.style?.[0] || 'blackwork';
  const styleHint = STYLE_PROMPTS[style] || STYLE_PROMPTS.blackwork;

  const fullPrompt = [
    prompt,
    styleHint,
    'professional tattoo flash art',
    'white background',
    'print-ready stencil quality',
    'no watermark',
  ].filter(Boolean).join(', ');

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  try {
    const referenceFile = files.reference?.[0];
    let output;

    if (referenceFile) {
      // Image-to-image: use the uploaded reference
      const imgBuffer = fs.readFileSync(referenceFile.filepath);
      const base64    = imgBuffer.toString('base64');
      const mime      = referenceFile.mimetype || 'image/jpeg';
      const dataUri   = `data:${mime};base64,${base64}`;

      output = await replicate.run('black-forest-labs/flux-dev', {
        input: {
          prompt:               fullPrompt,
          image:                dataUri,
          strength:             0.72,
          num_inference_steps:  28,
          guidance_scale:       3.5,
          output_format:        'png',
        },
      });
    } else {
      // Text-to-image
      output = await replicate.run('black-forest-labs/flux-dev', {
        input: {
          prompt:               fullPrompt,
          num_inference_steps:  28,
          guidance_scale:       3.5,
          width:                1024,
          height:               1024,
          output_format:        'png',
        },
      });
    }

    const url = Array.isArray(output) ? output[0] : String(output);

    // TODO: deduct credits from authenticated user here

    return res.status(200).json({ url });

  } catch (err) {
    console.error('Tattoo generation error:', err);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
