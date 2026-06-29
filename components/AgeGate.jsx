// components/AgeGate.jsx
//
// Blocking 18+ age verification modal. Wraps every page (mounted in
// _app.js) so nothing on the site is visible until confirmed. This is
// the real, legally-meaningful gate — distinct from the static footer
// disclaimer on the homepage, which nobody is required to interact
// with and carries much less weight on its own.
//
// Remembered via localStorage so a confirmed visitor isn't asked again
// on every page load in the same browser. Declining sends the visitor
// away from the site entirely rather than letting them dismiss the
// modal and continue.

import { useEffect, useState } from "react";

const STORAGE_KEY = "smokeshaq_age_verified";

export default function AgeGate({ children }) {
  // null = still checking localStorage (avoids a flash of the gate on
  // every navigation for already-verified visitors before the effect runs)
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setVerified(stored === "true");
    } catch {
      // localStorage unavailable (privacy mode, etc.) — fail safe by
      // still showing the gate rather than skipping it.
      setVerified(false);
    }
  }, []);

  function handleConfirm() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // If storage isn't available, the gate will simply reappear on
      // next load — not ideal, but never less safe than asking again.
    }
    setVerified(true);
  }

  function handleDecline() {
    window.location.href = "https://www.google.com";
  }

  if (verified === null) {
    return null; // brief blank frame while checking localStorage, avoids gate flicker
  }

  if (verified) {
    return children;
  }

  return (
    <div className="age-gate-overlay">
      <div className="age-gate-card">
        <h1 className="age-gate-title">Age Verification Required</h1>
        <p className="age-gate-body">
          AI Smoke Shaq Studio includes AI-generated content intended for
          adults. By entering, you confirm that you are at least 18 years
          old (or the age of majority in your jurisdiction) and that you
          are solely responsible for any content you upload or generate.
        </p>
        <p className="age-gate-body age-gate-body-small">
          We are not responsible for misuse of uploaded images, generated
          content, or use of material that does not belong to you.
        </p>
        <div className="age-gate-actions">
          <button className="age-gate-confirm" onClick={handleConfirm} type="button">
            I am 18 or older — Enter
          </button>
          <button className="age-gate-decline" onClick={handleDecline} type="button">
            I am under 18 — Exit
          </button>
        </div>
      </div>

      <style jsx>{`
        .age-gate-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(circle at top, #111827 0, #02030a 55%, #000000 100%);
        }

        .age-gate-card {
          max-width: 480px;
          width: 100%;
          background: rgba(10, 10, 18, 0.92);
          border: 1px solid rgba(255, 215, 0, 0.4);
          border-radius: 20px;
          box-shadow: 0 0 40px rgba(255, 215, 0, 0.15);
          padding: 32px 28px;
          text-align: center;
          backdrop-filter: blur(16px);
        }

        .age-gate-title {
          font-size: 1.4rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #f3d98b;
          margin: 0 0 18px;
        }

        .age-gate-body {
          font-size: 0.95rem;
          color: #e5e7eb;
          opacity: 0.85;
          line-height: 1.5;
          margin: 0 0 14px;
        }

        .age-gate-body-small {
          font-size: 0.8rem;
          opacity: 0.65;
        }

        .age-gate-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 22px;
        }

        .age-gate-confirm {
          padding: 12px 20px;
          border-radius: 999px;
          border: 1px solid rgba(255, 215, 0, 0.8);
          background: linear-gradient(135deg, #c9a227, #f3d98b);
          color: #0b0b0d;
          font-weight: 600;
          font-size: 0.9rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .age-gate-decline {
          padding: 10px 20px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          color: #9ca3af;
          font-size: 0.85rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
