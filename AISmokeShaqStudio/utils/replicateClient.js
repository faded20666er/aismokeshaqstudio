const axios = require("axios");

class ReplicateClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.replicate.com/v1";
  }

  async runModel(modelId, version, input) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/predictions`,
        {
          version,
          input
        },
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      return response.data;
    } catch (err) {
      console.error("Replicate API Error:", err.response?.data || err.message);
      throw new Error("Replicate request failed");
    }
  }

  async getPrediction(predictionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Token ${this.apiKey}`
          }
        }
      );

      return response.data;
    } catch (err) {
      console.error("Replicate Status Error:", err.response?.data || err.message);
      throw new Error("Failed to fetch prediction status");
    }
  }
}
module.exports = ReplicateClient;
