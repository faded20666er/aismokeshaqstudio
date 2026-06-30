// components/TimelineEditor.jsx
//
// The actual visual timeline — a horizontal ruler in seconds, with the
// scene clip as a stretchable block at the top and one row/track per
// character below it, each holding that character's draggable,
// stretchable dialogue blocks. This is what makes it possible to SEE
// where every line falls and how long the clip runs, instead of
// guessing start/length numbers into a form.
//
// All positions/widths are computed in pixels from the container's
// real rendered width at drag-time (not percentages), then converted
// back to seconds for the actual data (blocks[].startTime/duration,
// clipSeconds) — this keeps the maths simple and avoids percent-of-
// percent rounding drift while dragging.

import { useRef, useState, useEffect } from "react";

const TRACK_COLORS = ["#ff8a2a", "#7dd3fc", "#86efac", "#f9a8d4", "#f3d98b"];
const MIN_BLOCK_SECONDS = 1;

export default function TimelineEditor({
  characters,
  blocks,
  onChange,
  clipSeconds,
  onClipSecondsChange,
  maxClipSeconds,
}) {
  const trackAreaRef = useRef(null);
  const [pxPerSecond, setPxPerSecond] = useState(40);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [drag, setDrag] = useState(null); // { blockId, mode: "move"|"resize-left"|"resize-right", startX, originalStart, originalDuration }

  const MIN_PX_PER_SECOND = 8; // zoomed all the way out
  const MAX_PX_PER_SECOND = 200; // zoomed all the way in

  // Refs mirroring the latest pxPerSecond/clipSeconds/onChange/
  // onClipSecondsChange/maxClipSeconds on every render. The global
  // mousemove/mouseup listeners attached during a drag (below) read
  // from these refs instead of depending on the values directly —
  // see the [drag]/[sceneDrag]-only effects further down for why.
  const pxPerSecondRef = useRef(pxPerSecond);
  useEffect(() => {
    pxPerSecondRef.current = pxPerSecond;
  }, [pxPerSecond]);

  const clipSecondsRef = useRef(clipSeconds);
  useEffect(() => {
    clipSecondsRef.current = clipSeconds;
  }, [clipSeconds]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onClipSecondsChangeRef = useRef(onClipSecondsChange);
  useEffect(() => {
    onClipSecondsChangeRef.current = onClipSecondsChange;
  }, [onClipSecondsChange]);

  const maxClipSecondsRef = useRef(maxClipSeconds);
  useEffect(() => {
    maxClipSecondsRef.current = maxClipSeconds;
  }, [maxClipSeconds]);

  function fitToScreen() {
    if (!trackAreaRef.current) return;
    const width = trackAreaRef.current.clientWidth;
    setPxPerSecond(
      Math.max(MIN_PX_PER_SECOND, Math.min(MAX_PX_PER_SECOND, width / clipSecondsRef.current))
    );
  }

  function zoomIn() {
    setPxPerSecond((p) => Math.min(MAX_PX_PER_SECOND, p * 1.5));
  }

  function zoomOut() {
    setPxPerSecond((p) => Math.max(MIN_PX_PER_SECOND, p / 1.5));
  }

  // Fit to screen once on mount, and again on window resize. NOT
  // re-run on every clipSeconds change anymore — dragging the scene
  // clip's length handle calls onClipSecondsChange on every mousemove
  // tick, and refitting on each of those ticks reset the zoom level
  // out from under the user mid-drag (reported as "zoom fights you /
  // timeline gets stuck"). Click "Fit" explicitly to re-fit after
  // resizing the clip.
  useEffect(() => {
    fitToScreen();
    window.addEventListener("resize", fitToScreen);
    return () => window.removeEventListener("resize", fitToScreen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple playhead animation loop — purely visual scrubbing preview,
  // does not actually play any audio/video (there's nothing rendered
  // to play until after generation).
  useEffect(() => {
    if (!isPlaying) return;
    let raf;
    let last = performance.now();
    function tick(now) {
      const delta = (now - last) / 1000;
      last = now;
      setPlayheadSeconds((p) => {
        const next = p + delta;
        if (next >= clipSeconds) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, clipSeconds]);

  const secondsToPx = (s) => s * pxPerSecond;
  const pxToSeconds = (px) => px / pxPerSecond;

  // Reads clipSecondsRef instead of the closed-over clipSeconds so
  // this stays correct no matter which render's closure it's called
  // from — needed now that the drag effect below no longer re-runs
  // (and re-closes) on every clipSeconds change.
  function clampBlock(startTime, duration) {
    const clampedDuration = Math.max(MIN_BLOCK_SECONDS, duration);
    const clampedStart = Math.max(0, Math.min(startTime, clipSecondsRef.current - clampedDuration));
    return { startTime: clampedStart, duration: clampedDuration };
  }

  function handleBlockMouseDown(e, block, mode) {
    e.stopPropagation();
    setDrag({
      blockId: block.id,
      mode,
      startX: e.clientX,
      originalStart: block.startTime,
      originalDuration: block.duration,
    });
  }

  useEffect(() => {
    if (!drag) return;

    function handleMouseMove(e) {
      const deltaPx = e.clientX - drag.startX;
      const deltaSeconds = deltaPx / pxPerSecondRef.current;

      onChangeRef.current((prevBlocks) =>
        prevBlocks.map((b) => {
          if (b.id !== drag.blockId) return b;

          if (drag.mode === "move") {
            const { startTime, duration } = clampBlock(
              drag.originalStart + deltaSeconds,
              drag.originalDuration
            );
            return { ...b, startTime, duration };
          }

          if (drag.mode === "resize-right") {
            const { startTime, duration } = clampBlock(
              drag.originalStart,
              drag.originalDuration + deltaSeconds
            );
            return { ...b, startTime, duration };
          }

          if (drag.mode === "resize-left") {
            const proposedStart = drag.originalStart + deltaSeconds;
            const proposedDuration = drag.originalDuration - deltaSeconds;
            if (proposedDuration < MIN_BLOCK_SECONDS) return b;
            const { startTime, duration } = clampBlock(proposedStart, proposedDuration);
            return { ...b, startTime, duration };
          }

          return b;
        })
      );
    }

    function handleMouseUp() {
      setDrag(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // Deliberately only [drag]: pxPerSecondRef/onChangeRef/clampBlock
    // (which itself reads clipSecondsRef) carry the live values, so
    // this listener pair attaches once per drag and isn't torn down
    // and rebuilt mid-drag by an unrelated zoom/clip-length change.
  }, [drag]);

  // Scene clip block (top row) — stretching it changes clipSeconds
  // itself, which also rescales every dialogue block's visual position
  // proportionally on next render (their startTime/duration in seconds
  // doesn't change, only how many pixels-per-second represents them).
  const [sceneDrag, setSceneDrag] = useState(null); // { startX, originalClipSeconds }

  function handleSceneResizeStart(e) {
    e.stopPropagation();
    setSceneDrag({ startX: e.clientX, originalClipSeconds: clipSeconds });
  }

  useEffect(() => {
    if (!sceneDrag) return;

    function handleMouseMove(e) {
      const deltaPx = e.clientX - sceneDrag.startX;
      const deltaSeconds = deltaPx / pxPerSecondRef.current;
      const next = Math.round(
        Math.max(5, Math.min(maxClipSecondsRef.current, sceneDrag.originalClipSeconds + deltaSeconds))
      );
      onClipSecondsChangeRef.current(next);
    }

    function handleMouseUp() {
      setSceneDrag(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // Same reasoning as the block-drag effect above: only [sceneDrag],
    // live values come from refs so this isn't rebuilt mid-drag.
  }, [sceneDrag]);

  function handleRulerClick(e) {
    if (!trackAreaRef.current) return;
    const rect = trackAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    setPlayheadSeconds(Math.max(0, Math.min(clipSeconds, pxToSeconds(clickX))));
  }

  const rulerMarks = [];
  for (let s = 0; s <= clipSeconds; s += clipSeconds > 30 ? 5 : 1) {
    rulerMarks.push(s);
  }

  return (
    <div className="timeline-editor">
      <div className="timeline-editor-controls">
        <button
          type="button"
          className="timeline-play-btn"
          onClick={() => setIsPlaying((p) => !p)}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <span className="timeline-playhead-label">
          {playheadSeconds.toFixed(1)}s / {clipSeconds}s
        </span>

        <div className="timeline-zoom-controls">
          <button type="button" className="timeline-zoom-btn" onClick={zoomOut} title="Zoom out">
            −
          </button>
          <button type="button" className="timeline-zoom-btn" onClick={fitToScreen} title="Fit whole clip">
            Fit
          </button>
          <button type="button" className="timeline-zoom-btn" onClick={zoomIn} title="Zoom in">
            +
          </button>
        </div>
      </div>

      <div className="timeline-ruler" onClick={handleRulerClick}>
        {rulerMarks.map((s) => (
          <span
            key={s}
            className="timeline-ruler-mark"
            style={{ left: `${secondsToPx(s)}px` }}
          >
            {s}s
          </span>
        ))}
      </div>

      <div className="timeline-track-area" ref={trackAreaRef}>
        <div
          className="timeline-playhead-line"
          style={{ left: `${secondsToPx(playheadSeconds)}px` }}
        />

        {/* SCENE TRACK */}
        <div className="timeline-track timeline-scene-track">
          <span className="timeline-track-label">Scene</span>
          <div
            className="timeline-scene-block"
            style={{ width: `${secondsToPx(clipSeconds)}px` }}
          >
            <span className="timeline-scene-block-text">{clipSeconds}s clip</span>
            <div
              className="timeline-resize-handle timeline-resize-handle-right"
              onMouseDown={handleSceneResizeStart}
            />
          </div>
        </div>

        {/* PER-CHARACTER TRACKS */}
        {characters.map((char, i) => {
          const color = TRACK_COLORS[i % TRACK_COLORS.length];
          const charBlocks = blocks.filter((b) => b.characterId === char.id);

          return (
            <div key={char.id} className="timeline-track">
              <span className="timeline-track-label" style={{ color }}>
                {char.name}
              </span>
              <div className="timeline-track-lane" style={{ width: `${secondsToPx(clipSeconds)}px` }}>
                {charBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="timeline-dialogue-block"
                    style={{
                      left: `${secondsToPx(block.startTime)}px`,
                      width: `${secondsToPx(block.duration)}px`,
                      background: color,
                    }}
                    onMouseDown={(e) => handleBlockMouseDown(e, block, "move")}
                  >
                    <div
                      className="timeline-resize-handle timeline-resize-handle-left"
                      onMouseDown={(e) => handleBlockMouseDown(e, block, "resize-left")}
                    />
                    <span className="timeline-dialogue-block-text">
                      {block.audioSource === "upload"
                        ? "🎵 " + (block.audioFileName || "audio")
                        : block.text || "…"}
                    </span>
                    <button
                      type="button"
                      className="timeline-dialogue-block-delete"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onChange((prev) => prev.filter((b) => b.id !== block.id))}
                      title="Remove this line"
                    >
                      ×
                    </button>
                    <div
                      className="timeline-resize-handle timeline-resize-handle-right"
                      onMouseDown={(e) => handleBlockMouseDown(e, block, "resize-right")}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .timeline-editor {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0, 0, 0, 0.35);
          border-radius: 14px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .timeline-editor-controls {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          max-width: 100%;
        }

        .timeline-play-btn {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 215, 0, 0.6);
          background: rgba(255, 215, 0, 0.12);
          color: #f3d98b;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .timeline-playhead-label {
          font-size: 0.78rem;
          opacity: 0.7;
          font-family: monospace;
        }

        .timeline-zoom-controls {
          display: flex;
          gap: 4px;
          margin-left: auto;
        }

        .timeline-zoom-btn {
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.05);
          color: #d9d9d9;
          font-size: 0.78rem;
          cursor: pointer;
          font-family: inherit;
        }

        .timeline-zoom-btn:hover {
          background: rgba(255, 215, 0, 0.12);
          border-color: rgba(255, 215, 0, 0.4);
        }

        .timeline-ruler {
          position: relative;
          height: 20px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .timeline-ruler-mark {
          position: absolute;
          top: 0;
          font-size: 0.65rem;
          opacity: 0.5;
          transform: translateX(-50%);
        }

        .timeline-track-area {
          position: relative;
          overflow-x: scroll;
          max-width: 100%;
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: rgba(255, 215, 0, 0.6) rgba(255, 255, 255, 0.08); /* Firefox */
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-top: 6px;
          padding-bottom: 10px;
        }

        /* Chrome/Edge/Safari — overlay scrollbars on these browsers
           auto-hide after inactivity by default. Explicit ::-webkit-
           scrollbar rules force a persistent, always-visible track so
           it doesn't disappear after a few seconds like the reported
           bug, and matches the site's gold accent instead of the
           generic system gray. */
        .timeline-track-area::-webkit-scrollbar {
          height: 10px;
        }

        .timeline-track-area::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 6px;
        }

        .timeline-track-area::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.6);
          border-radius: 6px;
        }

        .timeline-track-area::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 215, 0, 0.85);
        }

        .timeline-playhead-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #fff;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
          z-index: 5;
          pointer-events: none;
        }

        .timeline-track {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
        }

        .timeline-track-label {
          width: 90px;
          flex-shrink: 0;
          font-size: 0.75rem;
          font-weight: 600;
          opacity: 0.85;
        }

        .timeline-track-lane {
          position: relative;
          height: 30px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
        }

        .timeline-scene-track .timeline-scene-block {
          position: relative;
          height: 30px;
          border-radius: 6px;
          background: linear-gradient(135deg, #c9a227, #f3d98b);
          display: flex;
          align-items: center;
          padding: 0 8px;
        }

        .timeline-scene-block-text {
          font-size: 0.72rem;
          color: #0b0b0d;
          font-weight: 600;
        }

        .timeline-dialogue-block {
          position: absolute;
          top: 0;
          height: 30px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 8px;
          cursor: grab;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
        }

        .timeline-dialogue-block:active {
          cursor: grabbing;
        }

        .timeline-dialogue-block-text {
          font-size: 0.72rem;
          color: #0b0b0d;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          pointer-events: none;
          flex: 1;
        }

        .timeline-dialogue-block-delete {
          background: rgba(0, 0, 0, 0.25);
          border: none;
          color: #0b0b0d;
          font-size: 0.85rem;
          line-height: 1;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          cursor: pointer;
          flex-shrink: 0;
          padding: 0;
        }

        .timeline-resize-handle {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 8px;
          cursor: ew-resize;
        }

        .timeline-resize-handle-left {
          left: 0;
        }

        .timeline-resize-handle-right {
          right: 0;
        }
      `}</style>
    </div>
  );
}
