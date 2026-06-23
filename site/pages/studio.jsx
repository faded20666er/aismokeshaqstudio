// pages/studio.jsx
import { useState } from 'react';
import StudioPanel from '../components/StudioPanel';
import { getUserId } from '../utils/getUserId';

// Each generation category hits a different API route, since lipsync
// and tts take different input shapes than plain image/video.
const ENDPOINT_BY_CATEGORY = {
  image: '/api/generate',
  video: '/api/generate',
  lipsync: '/api/lipsync',
  tts: '/api/voice',
};

export default function StudioPage() {
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credits, setCredits] = useState(null);

  const handleGenerate = async ({ category, modelId, nsfwEnabled, inputs }) => {
    try {
      setLoading(true);
      setError(null);

      const userId = getUserId();
      const endpoint = ENDPOINT_BY_CATEGORY[category] || '/api/generate';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, userId, nsfwEnabled, inputs }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setOutput(data.output);

      if (typeof data.creditsRemaining === 'number') {
        setCredits(data.creditsRemaining);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="studio-root">
      <div className="studio-overlay" />
      <div className="studio-layout">
        <div style={{ maxWidth: 1200, margin: "0 auto 12px", textAlign: "right" }}>
          <a href="/timeline" className="panel-link">
            Multi-Character Timeline →
          </a>
        </div>
        <StudioPanel
          onGenerate={handleGenerate}
          loading={loading}
          error={error}
          credits={credits}
          output={output}
        />
      </div>
    </div>
  );
}
