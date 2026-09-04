// next.config.js
//
// Only exists to guarantee the ffmpeg-static binary actually ships in
// the deployed serverless function bundle for the Multi-Character
// Timeline's audio-merge step (utils/mergeCharacterAudio.js).
//
// WHY THIS IS NEEDED: Next.js's build-time file tracing (which decides
// what actually gets bundled into each serverless function on Vercel)
// follows real `require`/`import` calls — but ffmpeg-static's own
// index.js resolves its binary path via a computed/conditional
// expression (picking a platform-specific binary at runtime), which
// static tracing can miss entirely. If that happens, the function
// deploys fine and only fails the first time someone actually runs a
// multi-line Timeline generation, with a "ffmpeg binary not found"-
// style error — exactly the kind of silent-until-a-real-customer-hits-
// it failure this project has hit more than once already. Being
// explicit here costs nothing and removes the guesswork.
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/timeline-generate": ["./node_modules/ffmpeg-static/**"],
    },
  },

  // SECURITY FIX [Sep 4 2026]: an outside security review (checked
  // against securityheaders.com's own checklist) found none of these
  // set anywhere. Without X-Frame-Options in particular, someone could
  // embed this site inside an invisible iframe on a lookalike page and
  // trick a signed-in visitor into clicking things on the REAL site
  // without realizing it ("clickjacking") — a real risk for a site
  // with paid checkout and account actions.
  //
  // Deliberately NOT adding a Content-Security-Policy here yet: a CSP
  // strict enough to matter has to explicitly allow every real script/
  // frame/connect source this site actually uses (Clerk's auth UI,
  // Stripe Checkout, Vercel Analytics, Vercel Blob, the WaveSpeed/
  // ElevenLabs/Replicate API calls, etc.) — get that wrong and it's
  // the exact same "site broken for everyone, ads running" failure
  // mode this project already lived through once this session with
  // the Clerk production migration. Worth doing, but as its own
  // carefully-tested change, not bundled in here.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // SAMEORIGIN (not DENY): still fully blocks the "embed the
            // real site in a hidden iframe on a phishing page" attack
            // above, without risking breaking any legitimate same-site
            // embedding Clerk's own components might rely on.
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            // Stops a browser from ever guessing/"sniffing" a file's
            // type differently than the Content-Type this site actually
            // sent — closes off a class of trick where a file crafted
            // to look like one type gets executed as another.
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Don't leak this site's full URLs (which can include
            // sensitive query params) to third-party sites a visitor
            // clicks through to, while still sending the plain origin
            // for same-site navigation and normal analytics.
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Explicitly turns off browser features this site has no
            // legitimate use for, so an embedded/compromised third-party
            // script couldn't invoke them even if it tried.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
