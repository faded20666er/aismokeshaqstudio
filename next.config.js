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
};

export default nextConfig;
