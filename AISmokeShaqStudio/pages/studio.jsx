// pages/studio.jsx
import { useState } from 'react';
import StudioPanel from '../components/StudioPanel';

export default function StudioPage() {
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credits, setCredits] = useState(null);

  const handleGenerate = async ({ type, model, prompt }) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, model, prompt }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Generation failed');
      }

      const data = await res.json();
      setOutput(data);
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
