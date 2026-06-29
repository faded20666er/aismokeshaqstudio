// pages/index.jsx
import { useState } from "react";
import Image from "next/image";
import AuthHeader from "../components/AuthHeader";
import { useAppUserId } from "../utils/useAppUserId";

const TIERS = [
  { key: "starter", name: "Starter", price: 10, credits: 200 },
  { key: "pro", name: "Pro", price: 29, credits: 500 },
  { key: "premium", name: "Premium", price: 59, credits: 1000 },
];

const FEATURE_PILLARS = [
  {
    title: "Image Studio",
    items: ["Image → Image", "Image → Variation", "Branding", "Logos", "Art"],
  },
  {
    title: "Video Engine",
    items: ["Image → Video", "Motion", "Camera moves", "Cinematic shots"],
  },
  {
    title: "Lip Sync Studio",
    badge: "New",
    items: ["Multi-character", "Timeline", "Dialogue blocks", "Audio sync", "Character slots"],
  },
  {
    title: "Voice Studio",
    items: ["Text to speech", "Multiple voices", "Script reading", "Narration"],
  },
];

const MODEL_GROUPS = [
  { label: "Image", names: ["FLUX", "Seedream", "Imagen", "WAN", "Ideogram", "MiniMax", "ComfyUI"] },
  {
    label: "Video",
    names: [
      "Runway", "VEO", "Kling", "Seedance", "WAN", "Hailuo",
      "PrunaAI", "HappyHorse", "Fabric", "DreamActor", "ToonCrafter", "Grok",
    ],
  },
  {
    label: "Voice",
    names: ["ElevenLabs", "Inworld", "MiniMax", "Gemini", "Resemble", "Tortoise", "F5 TTS", "OpenVoice"],
  },
  { label: "Lip Sync", names: ["PixVerse", "Sync", "HeyGen", "Kling"] },
];

export default function Home() {
  const [loadingTier, setLoadingTier] = useState(null);
  const [error, setError] = useState(null);
  const { userId, isReady } = useAppUserId();

  async function handleSubscribe(tierKey) {
    try {
      if (!isReady || !userId) {
        throw new Error("Still loading your account — try again in a second.");
      }

      setError(null);
      setLoadingTier(tierKey);

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey, userId }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err.message || "Something went wrong starting checkout");
      setLoadingTier(null);
    }
  }

  return (
    <div className="home-root">
      <div className="home-overlay" />

      <div className="home-topbar">
        <AuthHeader />
      </div>

      <div className="home-content">
        <div className="home-logo">
          <Image
            src="/images/smoke-shaq-logo-clean.png"
            alt="Smoke Shaq Studio"
            width={500}
            height={500}
            priority
            className="home-logo-img"
          />
        </div>

        <p className="home-tagline">Built for creators, by creators</p>
        <p className="home-url">aismokeshaqstudio.shop</p>

        <div className="home-enter-box">
          <a href="/studio" className="home-button">
            Enter Studio →
          </a>
        </div>

        <div className="showcase-section">
          <p className="showcase-intro">
            Everything you need to create — pick a tool on the left, see the models
            powering it on the right.
          </p>

          <div className="showcase-pillars">
            {FEATURE_PILLARS.map((pillar) => (
              <div key={pillar.title} className="pillar-card">
                <div className="pillar-header">
                  <h3 className="pillar-title">{pillar.title}</h3>
                  {pillar.badge && <span className="pillar-badge">{pillar.badge}</span>}
                </div>
                <ul className="pillar-list">
                  {pillar.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="showcase-models">
            {MODEL_GROUPS.map((group, i) => (
              <div key={group.label} className="model-group">
                <span className="model-group-label">{group.label}</span>
                <div className="model-freehand">
                  {group.names.map((name, j) => (
                    <span
                      key={name}
                      className={`model-freehand-name model-color-${(i + j) % 5}`}
                      style={{
                        fontSize: `${0.85 + ((j % 3) * 0.12)}rem`,
                        transform: `rotate(${((i + j) % 5) - 2}deg)`,
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pricing-section">
          <p className="pricing-cta">Become a player now — activate a plan</p>
          <h2 className="pricing-title">Plans</h2>

          {error && <p className="panel-error">{error}</p>}

          <div className="pricing-grid">
            {TIERS.map((tier) => (
              <div key={tier.key} className="pricing-card">
                <h3 className="pricing-card-name">{tier.name}</h3>
                <p className="pricing-card-price">
                  ${tier.price}
                  <span className="pricing-card-period">/mo</span>
                </p>
                <p className="pricing-card-credits">{tier.credits} credits / month</p>
                <button
                  className="panel-button pricing-card-button"
                  disabled={loadingTier === tier.key}
                  onClick={() => handleSubscribe(tier.key)}
                >
                  {loadingTier === tier.key ? "Redirecting…" : "Subscribe"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <footer className="home-footer">
          <p className="home-disclaimer">
            By using AI Smoke Shaq Studio, you confirm you are 18 or older and agree
            that you are solely responsible for any content you upload or generate.
            We are not responsible for misuse of uploaded images, generated content,
            or use of material that does not belong to you.
          </p>
          <p className="home-contact">
            Questions, concerns, or feedback?{" "}
            <a href="mailto:support@aismokeshaqstudio.shop">support@aismokeshaqstudio.shop</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
