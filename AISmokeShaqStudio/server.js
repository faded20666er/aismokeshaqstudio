require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const CreditsManager = require("./utils/credits");
const checkCredits = require("./middleware/checkCredits");

// ROUTES
const generateRoute = require("./routes/generate");
const creditsRoute = require("./routes/credits");
const modelsRoute = require("./routes/models");

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));

// Initialize KV / Redis (replace with your actual KV client)
const { createClient } = require("@vercel/kv");
const kv = createClient({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

// Initialize credit manager
const creditsManager = new CreditsManager(kv);

// ROUTES
app.use("/models", modelsRoute);
app.use("/credits", creditsRoute(creditsManager));
app.use("/generate", checkCredits(creditsManager), generateRoute(creditsManager));

// ROOT TEST ENDPOINT
app.get("/", (req, res) => {
  res.send("AISmokeShaqStudio backend is running.");
});

// START SERVER
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
