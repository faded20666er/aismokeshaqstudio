// components/AgeGate.jsx
//
// NSFW age-declaration modal. No longer a site-wide gate (removed from
// _app.js) — this now fires only when a user tries to enable NSFW mode
// in StudioPanel. The site itself is not age-restricted; only the NSFW
// generation feature is.
//
// Self-declaration (checkbox + confirmation) is the legally standard
// approach for adult content platforms. The user must explicitly tick
// both boxes before the button activates. The decision is remembered
// in localStorage so returning users don't see it again on the same
// browser.
//
// Usage:
//   <AgeGate onConfirm={fn} onDecline={fn} />

import { useState } from "react";

export default function AgeGate({ onConfirm, onDecline }) {
  const [ageChecked, setAgeChecked] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);

  const canConfirm = ageChecked && tosChecked;

  return (
    <div className="ag-overlay" role="dialog" aria-modal="true" aria-label="Age verification">
      <div className="ag-card">
        <div className="ag-gold-bar" />

        <h2 className="ag-title">Age Verification Required</h2>
        <p className="ag-body">
          NSFW generation features are restricted to adults only. Please
          confirm the following before enabling this feature.
        </p>

        <div className="ag-checks">
          <label className="ag-check-row">
            <input
              type="checkbox"
              checked={ageChecked}
              onChange={(e) => setAgeChecked(e.target.checked)}
              className="ag-checkbox"
            />
            <span>
              I confirm I am <strong>18 years of age or older</strong> (or the
              age of majority in my jurisdiction).
            </span>
          </label>

          <label className="ag-check-row">
            <input
              type="checkbox"
              checked={tosChecked}
              onChange={(e) => setTosChecked(e.target.checked)}
              className="ag-checkbox"
            />
            <span>
              I agree that I am solely responsible for any content I upload or
              generate using this feature, and that I will not use it to create
              illegal content.
            </span>
          </label>
        </div>

        <p className="ag-disclaimer">
          AI Smoke Shaq Studio does not condone the use of this feature for
          illegal content. Misuse may result in account suspension.
        </p>

        <div className="ag-actions">
          <button
            type="button"
            className="ag-confirm"
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            Enable NSFW Mode
          </button>
          <button type="button" className="ag-decline" onClick={onDecline}>
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        .ag-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(6px);
        }

        .ag-card {
          position: relative;
          max-width: 460px;
          width: 100%;
          background: rgba(8, 8, 14, 0.97);
          border: 1px solid rgba(255, 215, 0, 0.35);
          border-radius: 20px;
          box-shadow:
            0 0 40px rgba(0, 0, 0, 0.9),
            0 0 18px rgba(255, 215, 0, 0.12);
          padding: 32px 28px 28px;
          text-align: center;
        }

        .ag-gold-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          border-radius: 20px 20px 0 0;
          background: linear-gradient(90deg, #c9a227, #f3d98b, #ffe9a8, #f3d98b, #c9a227);
          box-shadow: 0 0 14px rgba(255, 215, 0, 0.45);
        }

        .ag-title {
          font-size: 1.2rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #f3d98b;
          margin: 8px 0 14px;
        }

        .ag-body {
          font-size: 0.9rem;
          color: #d9d9d9;
          opacity: 0.85;
          line-height: 1.55;
          margin: 0 0 20px;
        }

        .ag-checks {
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-align: left;
          margin-bottom: 16px;
        }

        .ag-check-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 0.85rem;
          color: #d9d9d9;
          line-height: 1.45;
          cursor: pointer;
        }

        .ag-checkbox {
          margin-top: 2px;
          flex-shrink: 0;
          accent-color: #ff2a2a;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .ag-disclaimer {
          font-size: 0.72rem;
          color: #9ca3af;
          opacity: 0.7;
          line-height: 1.4;
          margin: 0 0 20px;
        }

        .ag-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ag-confirm {
          padding: 12px 20px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #ff2a2a, #ff8a2a);
          color: #0b0b0d;
          font-weight: 700;
          font-size: 0.9rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 0 16px rgba(255, 0, 0, 0.5);
          transition: 0.18s ease;
        }

        .ag-confirm:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .ag-confirm:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 0 22px rgba(255, 0, 0, 0.7);
        }

        .ag-decline {
          padding: 10px 20px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: transparent;
          color: #9ca3af;
          font-size: 0.85rem;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .ag-decline:hover {
          border-color: rgba(255, 255, 255, 0.35);
          color: #d9d9d9;
        }
      `}</style>
    </div>
  );
}
