const express = require("express");
const router = express.Router();
const models = require("../config/models");

// Returns all available models grouped by type
router.get("/", (req, res) => {
  try {
    res.json({
      success: true,
      models
    });
  } catch (err) {
    console.error("Models route error:", err);
    res.status(500).json({ error: "Failed to load models" });
  }
});

module.exports = router;
