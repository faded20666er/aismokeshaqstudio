// AISmokeShaqStudio/pages/studio.jsx

import StudioPanel from "../components/StudioPanel";

export default function StudioPage() {
  return (
    <div className="studio-page">
      {/* Smoke shimmer overlay */}
      <div className="smoke-layer smoke-layer-1" />
      <div className="smoke-layer smoke-layer-2" />

      <div className="studio-wrapper">
        <h1 className="title text-silver-red">Smoke Shaq Studio</h1>
        <p className="subtitle">
          Diamond Noir AI Creation Suite · Image · Video · Lipsync · TTS
        </p>
        <StudioPanel />
      </div>

      <style jsx>{`
        .studio-page {
          min-height: 100vh;
          background-image: url("/diamindbackgroud.jpeg");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          position: relative;
          overflow: hidden;
          font-family: "Poppins", sans-serif;
        }

        .studio-page::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 55%),
            rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
        }

        .smoke-layer {
          position: absolute;
          inset: -20%;
          background: url("/Artboard 1.png") center/cover no-repeat;
          opacity: 0.08;
          mix-blend-mode: screen;
          animation: smokeDrift 40s linear infinite;
          pointer-events: none;
        }

        .smoke-layer-2 {
          animation-duration: 55s;
          animation-direction: reverse;
          opacity: 0.12;
        }

        .studio-wrapper {
          position: relative;
          z-index: 2;
          max-width: 960px;
          margin: 0 auto;
          padding: 40px 24px 60px;
        }

        .title {
          text-align: center;
          font-size: 2.6rem;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }

        .subtitle {
          text-align: center;
          font-size: 0.95rem;
          opacity: 0.85;
          margin-bottom: 26px;
          color: #d9d9d9;
        }

        @keyframes smokeDrift {
          0% {
            transform: translate3d(-10px, 0, 0) scale(1.05);
          }
          50% {
            transform: translate3d(20px, -10px, 0) scale(1.08);
          }
          100% {
            transform: translate3d(-10px, 0, 0) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
