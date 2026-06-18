// AISmokeShaqStudio/pages/studio.jsx

import StudioPanel from "../components/StudioPanel";

export default function StudioPage() {
  return (
    <div className="studio-page">
      <div className="studio-wrapper">
        <h1 className="title">Smoke Shaq Studio</h1>
        <StudioPanel />
      </div>

      <style jsx>{`
        .studio-page {
          min-height: 100vh;
          background-image: url("/background.jpg");
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
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
        }

        .studio-wrapper {
          position: relative;
          z-index: 2;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 18px;
          backdrop-filter: blur(12px);
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.7);
        }

        .title {
          text-align: center;
          font-size: 2.4rem;
          font-weight: 700;
          margin-bottom: 25px;
          color: #d9d9d9;
          text-shadow:
            0 0 2px #ff2a2a,
            0 0 4px #ff2a2a,
            0 0 6px rgba(255, 0, 0, 0.6);
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}
