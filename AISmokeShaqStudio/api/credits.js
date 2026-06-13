export default async function handler(req, res) {
  try {
    const { user } = req.body;

    if (!user) return res.status(400).json({ error: "Missing user" });

    // Local credit store (expand later)
    let credits = parseInt(process.env.DEFAULT_CREDITS || "20");

    // Deduct 1 credit per production
    credits = Math.max(credits - 1, 0);

    res.status(200).json({ credits });
  } catch (err) {
    console.error("CREDITS ERROR:", err);
    res.status(500).json({ error: "Credit system failed" });
  export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb"
    }
  }
};

let users = {}; 
// In production: replace with database (Supabase, MongoDB, Firebase)

const TRIAL_CREDITS = {
  images: 2,
  videos: 1,
  talkingPhotos: 1
};

const SUBSCRIPTION_CREDITS = {
  basic: 50,
  plus: 200,
  pro: 600
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user } = req.body;

  if (!user) {
    return res.status(400).json({ error: "Missing user ID" });
  }

  // Create user if not exists
  if (!users[user]) {
    users[user] = {
      tier: "trial",
      credits: {
        images: TRIAL_CREDITS.images,
        videos: TRIAL_CREDITS.videos,
        talkingPhotos: TRIAL_CREDITS.talkingPhotos
      },
      lastReset: Date.now()
    };
  }

  // Monthly reset for paid tiers
  const now = Date.now();
  const month = 30 * 24 * 60 * 60 * 1000;

  if (now - users[user].lastReset > month) {
    if (users[user].tier !== "trial") {
      users[user].credits = {
        images: SUBSCRIPTION_CREDITS[users[user].tier],
        videos: SUBSCRIPTION_CREDITS[users[user].tier],
        talkingPhotos: SUBSCRIPTION_CREDITS[users[user].tier]
      };
    }
    users[user].lastReset = now;
  }

  return res.status(200).json({
    user,
    tier: users[user].tier,
    credits: users[user].credits
  });
}

