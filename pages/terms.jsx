// pages/terms.jsx
//
// Terms of Service. ADDED [Sep 3 2026] — see pages/privacy.jsx header
// comment for why this exists now and what it's based on. Same caveat
// applies: drafted from the site's real feature set and pricing
// (config/subscriptionTiers.js, components/AgeGate.jsx's existing NSFW
// self-declaration flow) as a real starting point, not generic filler —
// but this is NOT a substitute for review by a licensed attorney, given
// real money (Stripe subscriptions) and NSFW-capable AI generation are
// both in play. The "Governing Law" section below uses a placeholder
// state that the site owner needs to fill in with their actual state.

const LAST_UPDATED = "September 3, 2026";

export default function TermsOfService() {
  return (
    <div className="studio-root">
      <div className="studio-overlay" />
      <div className="studio-layout">
        <div className="panel-root legal-page">
          <div className="panel-gold-bar" />
          <div className="panel-header">
            <h1>Terms of Service</h1>
            <p>Last updated: {LAST_UPDATED}</p>
            <a href="/" className="panel-link">
              ← Back to Home
            </a>
          </div>

          <div className="legal-body">
            <p>
              These Terms of Service ("Terms") govern your use of AI Smoke
              Shaq Studio (the "Service"), operated at
              aismokeshaqstudio.shop. By creating an account or using the
              Service, you agree to these Terms. If you don't agree, please
              don't use the Service.
            </p>

            <h2>1. Eligibility</h2>
            <p>
              You must be at least 18 years old to create an account or use
              the Service, including any free features. Our NSFW generation
              feature is further gated behind an explicit, separate age and
              responsibility confirmation before it can be enabled.
            </p>

            <h2>2. Your Account</h2>
            <p>
              You're responsible for maintaining the security of your
              account and for all activity that happens under it. Let us
              know right away at the email below if you suspect
              unauthorized access.
            </p>

            <h2>3. The Service</h2>
            <p>
              AI Smoke Shaq Studio provides AI-powered image, video, voice,
              lip-sync, and music generation tools, delivered through a
              credit-based system. Available tools, models, and pricing may
              change over time as we add, remove, or update the underlying
              AI providers powering each feature.
            </p>

            <h2>4. Subscriptions, Billing &amp; Credits</h2>
            <p>
              Paid plans are billed monthly through Stripe and renew
              automatically until canceled. Current plans are Starter ($10/mo,
              200 credits), Pro ($29/mo, 500 credits), and Premium ($59/mo,
              1000 credits) — see the pricing section on our homepage for the
              most current numbers. You can cancel anytime; your plan remains
              active through the end of the billing period you already paid
              for. Unless stated otherwise at checkout, subscription payments
              and unused credits are non-refundable, including for partial
              billing periods. If our "Bring Your Own Key" feature is used to
              connect your own ElevenLabs API key, any usage costs on that
              provider's own account are billed directly to you by them, not
              by us.
            </p>

            <h2>5. Your Content</h2>
            <p>
              You retain ownership of the images, audio, video, and text you
              upload, and of the content you generate using the Service,
              subject to the license below. You're solely responsible for
              making sure you have the rights to anything you upload — don't
              upload material you don't own or don't have permission to use.
            </p>
            <p>
              By uploading or submitting content, you grant us a limited
              license to process, store, and transmit that content —
              including to the third-party AI providers powering our tools —
              solely for the purpose of operating the Service and generating
              your requested output.
            </p>

            <h2>6. Prohibited Uses</h2>
            <p>
              You may not use the Service to create, upload, or distribute:
            </p>
            <p>
              Any content that sexualizes, exploits, or endangers minors in
              any way, real or fictional — this is an absolute, zero-tolerance
              prohibition. Any violation results in immediate account
              termination and will be reported to the relevant authorities
              and, where applicable, the National Center for Missing &amp;
              Exploited Children (NCMEC) or equivalent bodies.
            </p>
            <p>
              Non-consensual intimate imagery, or content depicting a real,
              identifiable person in a sexual or intimate context without
              their explicit consent; content intended to harass, defame, or
              impersonate a real person; content that infringes anyone's
              copyright, trademark, or other rights; or any content that
              violates applicable law.
            </p>
            <p>
              We reserve the right to suspend or terminate any account, with
              or without notice, that we reasonably believe violates this
              section, and to cooperate with law enforcement where required.
            </p>

            <h2>7. NSFW Feature</h2>
            <p>
              Our NSFW generation feature is opt-in, gated behind an explicit
              age and responsibility confirmation, and subject to the same
              Prohibited Uses above without exception. Enabling this feature
              does not waive any part of Section 6.
            </p>

            <h2>8. AI-Generated Output</h2>
            <p>
              Output is produced by third-party AI models and may be
              imperfect, unpredictable, or occasionally resemble existing
              works by coincidence — we make no guarantee of accuracy,
              originality, or fitness for any particular purpose. You're
              responsible for reviewing and for how you use anything the
              Service generates for you.
            </p>

            <h2>9. Intellectual Property</h2>
            <p>
              The Service's software, branding, and design are owned by us
              and may not be copied or used without permission. This doesn't
              affect your ownership of your own uploaded or generated
              content as described in Section 5.
            </p>

            <h2>10. Third-Party Services</h2>
            <p>
              The Service relies on third-party providers (including Clerk,
              Stripe, Upstash, Vercel, ElevenLabs, WaveSpeed, Hugging Face,
              and others) to operate. We're not responsible for outages,
              errors, or changes on their end that affect the Service.
            </p>

            <h2>11. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any
              time for violation of these Terms, illegal activity, or abuse
              of the Service. You may stop using the Service and cancel your
              subscription at any time.
            </p>

            <h2>12. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available," without
              warranties of any kind, express or implied, to the fullest
              extent permitted by law.
            </p>

            <h2>13. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, AI Smoke Shaq Studio
              will not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Service. Our
              total liability for any claim relating to the Service is
              limited to the amount you paid us in the 3 months before the
              claim arose.
            </p>

            <h2>14. Governing Law</h2>
            <p>
              <em>
                [Placeholder — to be filled in with the site owner's actual
                state/jurisdiction before publishing]
              </em>{" "}
              These Terms are governed by the laws of the State of [Your
              State], United States, without regard to conflict-of-law
              principles.
            </p>

            <h2>15. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of
              the Service after changes take effect means you accept the
              updated Terms. Material changes will be reflected by updating
              the "Last updated" date above.
            </p>

            <h2>16. Contact</h2>
            <p>
              Questions about these Terms? Email us at{" "}
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

        .legal-body em {
          color: #fca5a5;
        }

        .legal-body a {
          color: #f3d98b;
        }
      `}</style>
    </div>
  );
}
