// pages/privacy.jsx
//
// Privacy Policy. ADDED [Sep 3 2026]: the site had no privacy policy or
// terms page at all (needed both for Google OAuth's consent screen and,
// more importantly, because this is a paid subscription site handling
// accounts, payments, and user-uploaded/generated content, including an
// NSFW-gated feature). Drafted from the site's real, actual data flow —
// verified against middleware/byokStore.js, middleware/creditsStore.js,
// middleware/historyStore.js, middleware/characterStore.js, pages/_app.jsx
// (Clerk + Vercel Analytics), and config/subscriptionTiers.js (Stripe) —
// rather than generic boilerplate that claims things the app doesn't
// actually do. This is NOT a substitute for review by a real attorney,
// especially given the NSFW-capable feature set; flagged to the site
// owner as a starting point, not a finished legal document.

const LAST_UPDATED = "September 3, 2026";

export default function PrivacyPolicy() {
  return (
    <div className="studio-root">
      <div className="studio-overlay" />
      <div className="studio-layout">
        <div className="panel-root legal-page">
          <div className="panel-gold-bar" />
          <div className="panel-header">
            <h1>Privacy Policy</h1>
            <p>Last updated: {LAST_UPDATED}</p>
            <a href="/" className="panel-link">
              ← Back to Home
            </a>
          </div>

          <div className="legal-body">
            <p>
              This Privacy Policy explains what information AI Smoke Shaq Studio
              ("we," "our," "the Service") collects, how we use it, and the
              choices you have. By using the Service, you agree to the
              practices described here.
            </p>

            <h2>1. Information We Collect</h2>
            <p>
              <strong>Account information.</strong> When you sign up, our
              authentication provider (Clerk) collects your name, email
              address, and — if you choose to sign in with Google — basic
              profile information from that provider. We don't see or store
              your password directly; Clerk handles that.
            </p>
            <p>
              <strong>Payment information.</strong> Subscriptions are
              processed by Stripe. We never see or store your full card
              number — Stripe handles payment details directly and only
              shares with us what's needed to manage your subscription (plan,
              billing status, and similar).
            </p>
            <p>
              <strong>Content you upload or generate.</strong> Images, video,
              audio, and text prompts you upload or create using the Service
              are processed in order to generate your output. Some of this
              content is sent to third-party AI model providers (see Section
              3) to produce results.
            </p>
            <p>
              <strong>Usage and account data.</strong> We store your credit
              balance, generation history, and — if you use the Character
              Library or Timeline features — saved character names and voice
              selections, in our database (Upstash Redis) so these are
              available across sessions.
            </p>
            <p>
              <strong>Your own API keys (optional).</strong> If you choose to
              connect your own ElevenLabs API key ("Bring Your Own Key"), it
              is encrypted before storage and is never displayed back to you
              or anyone else after you save it.
            </p>
            <p>
              <strong>Analytics.</strong> We use Vercel Analytics to
              understand overall site traffic (such as page views). This is
              aggregate, privacy-respecting analytics — we do not use it to
              build advertising profiles, and we do not sell your data to
              anyone.
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>
              We use the information above to: operate and provide the
              Service; process your generation requests; manage your
              subscription and billing; maintain your saved settings,
              history, and credit balance; prevent fraud and abuse; and
              improve the Service over time. We do not sell your personal
              information.
            </p>

            <h2>3. Third-Party Services We Use</h2>
            <p>
              Running the Service means some of your data necessarily passes
              through the following third parties, each under their own
              privacy terms: Clerk (authentication), Stripe (payments),
              Upstash (database hosting), Vercel (hosting and analytics), and
              the AI generation providers behind each tool — including
              ElevenLabs, WaveSpeed, Hugging Face, Atlas Cloud, and others as
              our model lineup changes. When you generate content, the
              relevant prompt, image, or audio is sent to whichever provider
              powers that specific model.
            </p>

            <h2>4. Age Requirement</h2>
            <p>
              The Service is intended for users 18 years of age or older,
              and our NSFW generation feature requires explicit
              self-declared age confirmation before it can be enabled. We do
              not knowingly collect information from anyone under 18. If you
              believe a minor has used the Service, contact us immediately
              at the email below.
            </p>

            <h2>5. Data Retention &amp; Deletion</h2>
            <p>
              We retain your account, history, and saved settings for as
              long as your account is active, so the Service works the way
              you'd expect across sessions. You can request deletion of your
              account and associated data at any time by emailing us — we'll
              remove what we can from our systems, though some information
              may be retained where required by law or by our payment
              processor for accounting purposes.
            </p>

            <h2>6. Security</h2>
            <p>
              We take reasonable, industry-standard measures to protect your
              information, including encrypting any API keys you provide us.
              No method of storage or transmission is 100% secure, and we
              can't guarantee absolute security.
            </p>

            <h2>7. Cookies</h2>
            <p>
              We use cookies required for authentication (via Clerk) to keep
              you signed in, and lightweight analytics cookies (via Vercel).
              We do not use cookies for third-party advertising.
            </p>

            <h2>8. Your Rights</h2>
            <p>
              You can access, correct, or request deletion of your personal
              information at any time by contacting us. Depending on where
              you live, you may have additional rights under local law
              (such as the GDPR or CCPA) — contact us and we'll do our best
              to help.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material
              changes will be reflected by updating the "Last updated" date
              above.
            </p>

            <h2>10. Contact</h2>
            <p>
              Questions about this policy? Email us at{" "}
              <a href="mailto:support@aismokeshaqstudio.shop">
                support@aismokeshaqstudio.shop
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .legal-page {
          max-width: 820px;
        }

        .legal-body {
          margin-top: 20px;
          font-size: 0.92rem;
          line-height: 1.7;
          color: #d9d9d9;
        }

        .legal-body h2 {
          margin-top: 28px;
          margin-bottom: 8px;
          font-size: 1.05rem;
          letter-spacing: 0.04em;
          color: #f3d98b;
        }

        .legal-body p {
          margin: 0 0 12px;
        }

        .legal-body a {
          color: #f3d98b;
        }
      `}</style>
    </div>
  );
}
