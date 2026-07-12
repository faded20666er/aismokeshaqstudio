// pages/tattoo.jsx
import { useState, useRef } from 'react';

const TATTOO_STYLES = [
  { value: 'blackwork',       label: 'Blackwork / Black & Grey' },
  { value: 'traditional',     label: 'Traditional American' },
  { value: 'neo-traditional', label: 'Neo-Traditional' },
  { value: 'watercolor',      label: 'Watercolor' },
  { value: 'geometric',       label: 'Geometric' },
  { value: 'tribal',          label: 'Tribal' },
  { value: 'japanese',        label: 'Japanese / Irezumi' },
  { value: 'fine-line',       label: 'Fine Line' },
  { value: 'realism',         label: 'Realism / Portrait' },
  { value: 'minimalist',      label: 'Minimalist' },
  { value: 'dotwork',         label: 'Dotwork / Stippling' },
  { value: 'biomechanical',   label: 'Biomechanical' },
  { value: 'chicano',         label: 'Chicano' },
  { value: 'old-school',      label: 'Old School Flash' },
];

const SIZES = [
  { value: 1,  label: '1"  — Finger / wrist accent' },
  { value: 2,  label: '2"  — Small / subtle' },
  { value: 3,  label: '3"  — Standard / palm-sized' },
  { value: 4,  label: '4"  — Medium' },
  { value: 5,  label: '5"  — Large forearm piece' },
  { value: 6,  label: '6"  — Half-sleeve width' },
  { value: 8,  label: '8"  — Large back / chest' },
  { value: 12, label: '12" — Full back / sleeve panel' },
];

// Approx screen pixels per inch (96 DPI standard)
const PX_PER_INCH = 96;

function toolBtn(active) {
  return {
    padding: '8px 16px',
    borderRadius: 999,
    background: active ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)',
    border: active ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.1)',
    color: active ? '#d4af37' : 'rgba(255,255,255,0.7)',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  };
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.45)',
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

export default function TattooPage() {
  const [prompt, setPrompt]               = useState('');
  const [style, setStyle]                 = useState('blackwork');
  const [size, setSize]                   = useState(3);
  const [refImage, setRefImage]           = useState(null);
  const [refPreview, setRefPreview]       = useState(null);
  const [result, setResult]               = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [stencilMode, setStencilMode]     = useState(false);
  const fileRef = useRef();

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setRefImage(file);
    const reader = new FileReader();
    reader.onload = ev => setRefPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (!prompt.trim() && !refImage) {
      setError('Add a description or upload a reference image first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = new FormData();
      body.append('prompt', prompt);
      body.append('style', style);
      body.append('size', size);
      if (refImage) body.append('reference', refImage);

      const res = await fetch('/api/generate-tattoo', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const displayPx = size * PX_PER_INCH;

  // Ruler tick marks for top & left rulers
  function RulerTicks({ count, horizontal }) {
    return Array.from({ length: count + 1 }).map((_, i) => (
      <div key={i} style={{
        position: 'absolute',
        ...(horizontal
          ? { left: i * PX_PER_INCH, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }
          : { top: i * PX_PER_INCH, right: 0, display: 'flex', flexDirection: 'row', alignItems: 'center' }),
      }}>
        {horizontal
          ? <>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginBottom: 1, lineHeight: 1 }}>{i}"</span>
              <div style={{ width: 1, height: 5, background: 'rgba(255,255,255,0.25)' }} />
            </>
          : <>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginRight: 2, lineHeight: 1 }}>{i}"</span>
              <div style={{ width: 5, height: 1, background: 'rgba(255,255,255,0.25)' }} />
            </>
        }
      </div>
    ));
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#fff', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h1 style={{
            fontSize: 38,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #d4af37, #f5d76e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 10px',
          }}>
            ⚡ Tattoo Generator
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, margin: 0 }}>
            Describe your vision, pick a style, and preview it at actual tattoo size.
          </p>
        </div>

        {/* Input grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>

          {/* Left: reference upload */}
          <div>
            <label style={labelStyle}>Reference Image (optional)</label>
            <div
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${refPreview ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {refPreview
                ? <img src={refPreview} alt="ref" style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 10 }} />
                : <div style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Upload a reference image</div>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 4 }}>JPG · PNG · WebP</div>
                  </div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            {refPreview && (
              <button
                onClick={() => { setRefImage(null); setRefPreview(null); }}
                style={{ marginTop: 8, background: 'none', border: 'none', color: 'rgba(255,80,80,0.7)', cursor: 'pointer', fontSize: 13 }}
              >
                ✕ Remove reference
              </button>
            )}
          </div>

          {/* Right: prompt + dropdowns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Describe your tattoo</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. A wolf howling at the moon, surrounded by pine trees and mountains, dark and detailed..."
                rows={5}
                style={{ ...inputBase, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Style</label>
              <select value={style} onChange={e => setStyle(e.target.value)} style={{ ...inputBase, background: '#141414', cursor: 'pointer' }}>
                {TATTOO_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Actual size on skin</label>
              <select value={size} onChange={e => setSize(Number(e.target.value))} style={{ ...inputBase, background: '#141414', cursor: 'pointer' }}>
                {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '14px 52px',
              borderRadius: 999,
              background: loading
                ? 'rgba(212,175,55,0.25)'
                : 'linear-gradient(135deg, #d4af37, #f5d76e)',
              color: '#0a0a0a',
              fontSize: 16,
              fontWeight: 900,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 0.3,
              transition: 'all 0.2s',
            }}
          >
            {loading ? '⚡ Generating...' : '⚡ Generate Tattoo'}
          </button>
          {error && (
            <div style={{ color: '#ff6b6b', marginTop: 12, fontSize: 14 }}>{error}</div>
          )}
        </div>

        {/* Result canvas with ruler */}
        {result && (
          <div style={{ marginBottom: 44 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'rgba(255,255,255,0.88)' }}>
              Your Design
            </h3>

            <div style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: 24,
              display: 'inline-block',
              maxWidth: '100%',
              overflow: 'auto',
            }}>
              {/* Ruler + image wrapper */}
              <div style={{ display: 'inline-flex', flexDirection: 'column' }}>

                {/* Top ruler */}
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 24 }} /> {/* corner spacer */}
                  <div style={{
                    position: 'relative',
                    width: displayPx,
                    height: 22,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '4px 4px 0 0',
                    overflow: 'hidden',
                  }}>
                    <RulerTicks count={size} horizontal />
                  </div>
                </div>

                <div style={{ display: 'flex' }}>
                  {/* Left ruler */}
                  <div style={{
                    position: 'relative',
                    width: 24,
                    height: displayPx,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '4px 0 0 4px',
                    overflow: 'hidden',
                  }}>
                    <RulerTicks count={size} horizontal={false} />
                  </div>

                  {/* The image */}
                  <img
                    src={result}
                    alt="Generated tattoo design"
                    style={{
                      width: displayPx,
                      height: displayPx,
                      objectFit: 'contain',
                      display: 'block',
                      filter: stencilMode ? 'grayscale(1) contrast(2.2) invert(1)' : 'none',
                      background: stencilMode ? '#fff' : 'transparent',
                    }}
                  />
                </div>
              </div>

              {/* Size label */}
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                Displayed at approx. {size}" × {size}" actual tattoo size (96 DPI)
              </div>

              {/* Tool bar */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setStencilMode(!stencilMode)} style={toolBtn(stencilMode)}>
                  {stencilMode ? '🎨 Color Mode' : '🖤 Stencil Mode'}
                </button>
                <a
                  href={result}
                  download="tattoo-design.png"
                  style={{ ...toolBtn(false), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  ⬇ Download PNG
                </a>
                <button onClick={handleGenerate} style={toolBtn(false)}>
                  🔄 Regenerate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Human Touch upsell — shows after generation */}
        {result && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.09), rgba(245,215,110,0.04))',
            border: '1px solid rgba(212,175,55,0.28)',
            borderRadius: 16,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#d4af37', margin: '0 0 6px' }}>
                ✋ Want the Human Touch?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0, maxWidth: 480 }}>
                For just <strong style={{ color: '#fff' }}>$5</strong>, Jay will personally review and hand-refine your AI design —
                fixing proportions, sharpening line work, and making it truly tattoo-ready.
                Delivered within 24 hours.
              </p>
            </div>
            <a
              href="https://www.fiverr.com/faded206"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '12px 28px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #d4af37, #f5d76e)',
                color: '#0a0a0a',
                fontSize: 15,
                fontWeight: 900,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Request for $5 →
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
