const axios = require("axios");

class HFClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api-inference.huggingface.co/models";
  }

  async runModel(modelId, input) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${modelId}`,
        input,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          responseType: "arraybuffer" // important for audio output
        }
      );

      return response.data;
    } catch (err) {
      console.error("HuggingFace API Error:", err.response?.data || err.message);
      throw new Error("HuggingFace request failed");
    }
  }
}

module.exports = HFClient;
