export default {
  id: "sdxl-lightning",
  name: "SDXL Lightning",
  provider: "huggingface",
  modelId: "stabilityai/sdxl-lightning",
  cost: 1,              // fast image
  estTime: "2s",
  strengths: [
    "Very fast",
    "General purpose",
    "Good for bulk generation"
  ],
  nsfw: false,
  type: "image"
};
