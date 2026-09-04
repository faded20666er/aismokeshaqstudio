// utils/enhancePrompt.js
//
// "Prompt Pimp" — the one-click prompt enhancer on the Studio's
// image/video prompt box (see components/StudioPanel.jsx's Enhance
// button). Rewrites a customer's rough idea into a more detailed,
// descriptive generation prompt via a real LLM call.
//
// Routed through Atlas Cloud's OpenAI-compatible chat completions API
// (https://api.atlascloud.ai/v1/chat/completions, confirmed via
// atlascloud.ai/docs/en/models/llm) — the SAME funded account/API key
// already used for the image/video/audio generation models (see
// utils/runModel.js's runAtlasCloud). This is a synchronous chat
// completion though, not the submit-then-poll generation flow those
// use, so it's kept as its own small helper rather than forced through
// that abstraction.
//
// Model: qwen/qwen3-8b — confirmed directly against Atlas Cloud's own
// model page (atlascloud.ai/models/qwen/qwen3-8b) before building this:
// $0.05 per million input tokens, $0.25 per million output tokens. A
// single enhance call (a short rough prompt in, a few sentences of
// rewritten prompt out) costs a small fraction of a cent — checked for
// real before shipping this, not assumed, since Jay was explicitly
// concerned this could be an ongoing cost he hadn't accounted for.
// pages/api/enhance-prompt.js charges 1 credit per use regardless (the
// credit system's smallest unit), which comfortably covers the real
// cost with room to spare.

const SYSTEM_PROMPTS = {
  image:
    "You are a prompt-writing assistant for an AI image generator. Rewrite the user's rough idea into a single, vivid, detailed image generation prompt — describe the subject, composition, lighting, mood, and visual style specifically. Output ONLY the rewritten prompt as one paragraph. No preamble, no explanation, no quotation marks, no markdown.",
  video:
    "You are a prompt-writing assistant for an AI video generator. Rewrite the user's rough idea into a single, vivid, detailed video generation prompt — describe the subject, the action/motion, camera movement, setting, lighting, and mood specifically. Output ONLY the rewritten prompt as one paragraph. No preamble, no explanation, no quotation marks, no markdown.",
};

export async function enhancePrompt(rawPrompt, category) {
  const systemPrompt = SYSTEM_PROMPTS[category] || SYSTEM_PROMPTS.image;

  const response = await fetch("https://api.atlascloud.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ATLASCLOUD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen/qwen3-8b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawPrompt },
      ],
      temperature: 0.8,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Atlas Cloud chat completion error (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json();
  const enhanced = data?.choices?.[0]?.message?.content?.trim();

  if (!enhanced) {
    throw new Error("Atlas Cloud returned an empty enhancement");
  }

  return enhanced;
}
