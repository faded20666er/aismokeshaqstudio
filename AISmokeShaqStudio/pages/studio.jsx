// AISmokeShaqStudio/pages/studio.jsx

import StudioPanel from "../components/StudioPanel";

export default function StudioPage() {
  return (
    <div className="studio-page">
      <div className="studio-wrapper">
        <StudioPanel />
      </div>

      <style jsx>{`
        .studio-page {
          min-height: 100vh;
          background-image: url("/your-background-image.jpg");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          position: relative;
          overflow: hidden;
        }

        .studio-page::before {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
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
          border-radius: 16px;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
        }

        h1 {
          font-family: "Cinzel", serif;
          color: #ffd700;
          text-align: center;
          margin-bottom: 20px;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}
