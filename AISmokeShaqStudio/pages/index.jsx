// pages/index.jsx
export default function Home() {
  return (
    <div className="home-root">
      <div className="home-overlay" />
      <div className="home-content">
        <h1 className="home-title">Smoke Shaq Studio</h1>
        <p className="home-subtitle">
          Diamond Noir AI Creator Suite · Image · Video · TTS · Lipsync
        </p>
        <a href="/studio" className="home-button">
          Enter Studio →
        </a>
      </div>
    </div>
  );
}
