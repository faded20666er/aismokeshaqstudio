// pages/studio.jsx
import { useState, useEffect } from 'react';
import StudioPanel from '../components/StudioPanel';
import AuthHeader from '../components/AuthHeader';
import { useAppUserId } from '../utils/useAppUserId';
import { pollJob } from '../utils/pollJob';

// Each generation category hits a different API route, since lipsync
// and tts take different input shapes than plain image/video.
const ENDPOINT_BY_CATEGORY = {
  image: '/api/generate',
  video: '/api/generate',
  lipsync: '/api/lipsync',
  tts: '/api/voice',
  music: '/api/music',
};

export default function StudioPage() {
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);
  const [credits, setCredits] = useState(null);
  const [userTier, setUserTier] = useState(null);
  const { userId, isReady } = useAppUserId();

  // Fetch the real credit balance + subscription tier on load. Tier
  // powers minTier-gated models (e.g. Kling V2.0 Master, Premium-only —
  // see middleware/tierCheck.js) so the dropdown shows them locked
  // instead of letting a Starter/Pro customer pick one and only find
  // out it's off-limits after clicking Generate.
  useEffect(() => {
    if (!isReady || !userId) return;
    fetch(`/api/credits?userId=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.credits === 'number') setCredits(data.credits);
        setUserTier(data.tier ?? null);
      })
      .catch(() => {
        // Non-fatal — credits/tier just won't be known until the next
        // successful generation updates them.
      });
  }, [isReady, userId]);

  const handleGenerate = async ({ category, modelId, nsfwEnabled, inputs }) => {
    try {
      if (!isReady || !userId) {
        throw new Error('Still loading your account — try again in a second.');
      }

      setLoading(true);
      setError(null);
      setStatusMessage('Submitting…');

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

      // Submit endpoints now return {jobId} immediately rather than
      // the final result — poll until it's actually done.
      setStatusMessage('Generating… this can take a little while for video.');

      const completedJob = await pollJob(data.jobId);

      setOutput(completedJob.output);

      if (typeof completedJob.creditsRemaining === 'number') {
        setCredits(completedJob.creditsRemaining);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="studio-root">
      <div className="studio-overlay" />
      <div className="studio-layout">
        <div
          style={{
            width: '100%',
            maxWidth: 1200,
            boxSizing: 'border-box',
            margin: '0 auto 12px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/timeline" className="panel-link">
              Multi-Character Timeline →
            </a>
            <a href="/history" className="panel-link">
              My Generations →
            </a>
          </div>
          <AuthHeader />
        </div>
        <StudioPanel
          onGenerate={handleGenerate}
          loading={loading}
          statusMessage={statusMessage}
          error={error}
          credits={credits}
          output={output}
          userId={userId}
          userTier={userTier}
        />
      </div>
    </div>
  );
}
