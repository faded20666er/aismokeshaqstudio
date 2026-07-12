// pages/audio.jsx
import { useState, useRef } from 'react';

// ── Jay's beat library ──────────────────────────────────────────────────────
// Add new beats here. Put the MP3 files in /public/beats/
const BEATS = [
  { id: 1, title: 'Smoke & Mirrors',  genre: 'Hip-Hop', bpm: 88,  free: true,  url: '/beats/smoke-mirrors.mp3' },
  { id: 2, title: 'G40 Theme',        genre: 'Trap',    bpm: 140, free: true,  url: '/beats/g40-theme.mp3'    },
  // { id: 3, title: 'Night Rider',   genre: 'R&B',     bpm: 75,  free: false, price: 5, url: '/beats/night-rider.mp3' },
];

const TABS = ['Sound Effects', 'Beats', 'Voices', 'Background Music'];

// ── Shared style helpers ────────────────────────────────────────────────────
const label = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 7,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const inputBase = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
  padding: '10px 13px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function GenBtn({ loading, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        padding: '12px 36px',
        borderRadius: 999,
        background: (loading || disabled)
          ? 'rgba(100,120,200,0.25)'
          : 'linear-gradient(135deg, #00c8f0, #7b2fff)',
        color: '#fff',
        fontSize: 15,
        fontWeight: 800,
        border: 'none',
        cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
        marginBottom: 24,
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}

function AudioResult({ url, filename, onUseInTimeline }) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 12,
      background: 'rgba(0,200,240,0.05)',
      border: '1px solid rgba(0,200,240,0.2)',
      marginTop: 4,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 10, color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
        ✅ Ready
      </div>
      <audio controls src={url} style={{ width: '100%', marginBottom: 14, borderRadius: 8 }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a
          href={url}
          download={filename}
          style={{
            padding: '8px 16px', borderRadius: 999,
            background: 'rgba(0,200,240,0.1)', border: '1px solid rgba(0,200,240,0.3)',
            color: '#00c8f0', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          ⬇ Download
        </a>
        {onUseInTimeline && (
          <button
            onClick={onUseInTimeline}
            style={{
              padding: '8px 16px', borderRadius: 999,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer',
            }}
          >
            📽 Use in Timeline
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AudioPage() {
  const [tab, setTab]               = useState(0);

  // SFX
  const [sfxPrompt, setSfxPrompt]   = useState('');
  const [sfxDur, setSfxDur]         = useState(3);
  const [sfxResult, setSfxResult]   = useState(null);
  const [sfxLoading, setSfxLoading] = useState(false);

  // Music
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicDur, setMusicDur]       = useState(15);
  const [musicResult, setMusicResult] = useState(null);
  const [musicLoading, setMusicLoading] = useState(false);

  const [error, setError]   = useState(null);
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);

  function togglePlay(url) {
    if (!audioRef.current) return;
    if (playing === url) {
      audioRef.current.pause();
      setPlaying(null);
    } else {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {});
      setPlaying(url);
    }
  }

  async function generateSFX() {
    if (!sfxPrompt.trim()) return;
    setSfxLoading(true); setError(null); setSfxResult(null);
    try {
      const res  = await fetch('/api/generate-sfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sfxPrompt, duration: sfxDur }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSfxResult(data.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setSfxLoading(false);
    }
  }

  async function generateMusic() {
    if (!musicPrompt.trim()) return;
    setMusicLoading(true); setError(null); setMusicResult(null);
    try {
      const res  = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: musicPrompt, duration: musicDur }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMusicResult(data.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setMusicLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#fff', padding: '40px 20px 80px' }}>

      {/* Hidden audio element for beat previews */}
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />

      <div style={{ maxWidth: 880, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h1 style={{
            fontSize: 38,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #00c8f0, #7b2fff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 10px',
          }}>
            🎵 Audio Studio
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: 0 }}>
            Sound effects · Original beats · Voices · Background music — stay in the studio.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => { setTab(i); setError(null); }}
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                border: 'none',
                background: tab === i
                  ? 'linear-gradient(135deg, #00c8f0, #7b2fff)'
                  : 'rgba(255,255,255,0.07)',
                color: tab === i ? '#fff' : 'rgba(255,255,255,0.55)',
                fontSize: 14,
                fontWeight: tab === i ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── TAB 0: Sound Effects ─────────────────────────────────────────── */}
        {tab === 0 && (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 24, fontSize: 14 }}>
              Describe any sound and generate it instantly — explosions, rain, UI clicks, crowds, anything.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 14, alignItems: 'end', marginBottom: 20 }}>
              <div>
                <label style={label}>Describe the sound</label>
                <textarea
                  value={sfxPrompt}
                  onChange={e => setSfxPrompt(e.target.value)}
                  placeholder='e.g. "Thunder crack followed by heavy rain on a metal roof"'
                  rows={3}
                  style={{ ...inputBase, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={label}>Duration</label>
                <select
                  value={sfxDur}
                  onChange={e => setSfxDur(Number(e.target.value))}
                  style={{ ...inputBase, background: '#141414', cursor: 'pointer' }}
                >
                  {[1, 2, 3, 5, 8, 10, 15, 22].map(d => (
                    <option key={d} value={d}>{d}s</option>
                  ))}
                </select>
              </div>
            </div>

            <GenBtn loading={sfxLoading} disabled={!sfxPrompt.trim()} onClick={generateSFX}>
              {sfxLoading ? '⏳ Generating...' : '🎵 Generate Sound Effect'}
            </GenBtn>

            {sfxResult && (
              <AudioResult
                url={sfxResult}
                filename="sound-effect.mp3"
                onUseInTimeline={() => {
                  // TODO: wire to Timeline audio track
                  window.location.href = '/timeline?audioUrl=' + encodeURIComponent(sfxResult);
                }}
              />
            )}
          </div>
        )}

        {/* ── TAB 1: Beats ─────────────────────────────────────────────────── */}
        {tab === 1 && (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 24, fontSize: 14 }}>
              Original beats produced by Jay. Free tracks available to all users.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {BEATS.map(beat => (
                <div key={beat.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  {/* Play button */}
                  <button
                    onClick={() => togglePlay(beat.url)}
                    style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: playing === beat.url
                        ? 'linear-gradient(135deg, #00c8f0, #7b2fff)'
                        : 'rgba(255,255,255,0.1)',
                      border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer',
                    }}
                  >
                    {playing === beat.url ? '⏸' : '▶'}
                  </button>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{beat.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                      {beat.genre} · {beat.bpm} BPM
                    </div>
                  </div>

                  {/* Badge + download */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {beat.free
                      ? <span style={{
                          padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                          background: 'rgba(0,255,150,0.1)', border: '1px solid rgba(0,255,150,0.3)', color: '#00ff96',
                        }}>FREE</span>
                      : <span style={{ color: '#d4af37', fontWeight: 800 }}>${beat.price}</span>
                    }
                    <a
                      href={beat.url}
                      download
                      style={{
                        padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                        background: 'rgba(0,200,240,0.08)', border: '1px solid rgba(0,200,240,0.25)',
                        color: '#00c8f0', textDecoration: 'none',
                      }}
                    >
                      ⬇ Download
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 24, padding: '20px 24px', borderRadius: 12,
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
              textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14,
            }}>
              More beats coming soon. Want something custom?{' '}
              <a href="https://www.fiverr.com/faded206" target="_blank" rel="noopener noreferrer"
                style={{ color: '#d4af37', textDecoration: 'none', fontWeight: 600 }}>
                Commission Jay on Fiverr →
              </a>
            </div>
          </div>
        )}

        {/* ── TAB 2: Voices ────────────────────────────────────────────────── */}
        {tab === 2 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎙️</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Voice Library</h3>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, maxWidth: 420, margin: '0 auto 28px' }}>
              Create a custom voice in the Studio, then optionally share or sell it here.
              Other users can preview and use community voices in their Timeline projects.
            </p>
            <span style={{
              padding: '9px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.28)', color: '#d4af37',
            }}>
              🔒 Premium Feature — Coming Soon
            </span>
          </div>
        )}

        {/* ── TAB 3: Background Music ───────────────────────────────────────── */}
        {tab === 3 && (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 24, fontSize: 14 }}>
              Generate royalty-free background music for your videos. Describe the mood — get a custom track.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 14, alignItems: 'end', marginBottom: 20 }}>
              <div>
                <label style={label}>Describe the music</label>
                <textarea
                  value={musicPrompt}
                  onChange={e => setMusicPrompt(e.target.value)}
                  placeholder='e.g. "Chill lo-fi hip-hop with a rainy day piano vibe" or "Dark trap instrumental with heavy 808s"'
                  rows={3}
                  style={{ ...inputBase, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={label}>Duration</label>
                <select
                  value={musicDur}
                  onChange={e => setMusicDur(Number(e.target.value))}
                  style={{ ...inputBase, background: '#141414', cursor: 'pointer' }}
                >
                  {[10, 15, 30, 45, 60, 90].map(d => (
                    <option key={d} value={d}>{d}s</option>
                  ))}
                </select>
              </div>
            </div>

            <GenBtn loading={musicLoading} disabled={!musicPrompt.trim()} onClick={generateMusic}>
              {musicLoading ? '⏳ Composing...' : '🎼 Generate Background Music'}
            </GenBtn>

            {musicResult && (
              <AudioResult
                url={musicResult}
                filename="background-music.mp3"
                onUseInTimeline={() => {
                  window.location.href = '/timeline?audioUrl=' + encodeURIComponent(musicResult);
                }}
              />
            )}
          </div>
        )}

        {/* Global error */}
        {error && (
          <div style={{
            marginTop: 20, padding: '12px 16px', borderRadius: 8,
            background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)',
            color: '#ff7070', fontSize: 14,
          }}>
            {error}
          </div>
        )}

      </div>
    </div>
  );
}
