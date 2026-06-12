// ====== DOM HOOKS ======
const tracksContainer = document.getElementById("lsTracks");
const timeRuler = document.getElementById("lsTimeRuler");
const scrubber = document.getElementById("lsScrubber");
const exportOutput = document.getElementById("lsExportOutput");
const statusBox = document.getElementById("lsStatus");

const playBtn = document.getElementById("lsPlayBtn");
const stopBtn = document.getElementById("lsStopBtn");
const exportBtn = document.getElementById("lsExportBtn");

const videoInput = document.getElementById("lsVideoInput");
const previewVideo = document.getElementById("lsPreviewVideo");

// ====== TIMELINE SETTINGS ======
const TIMELINE_WIDTH = 3000; // pixels
const BLOCK_MIN_WIDTH = 80;  // minimum block size
let isPlaying = false;

// ====== INIT TIMELINE ======
function initTimeline() {
  timeRuler.style.width = TIMELINE_WIDTH + "px";
  scrubber.style.left = "0px";

  const trackTimelines = document.querySelectorAll(".ls-track-timeline");
  trackTimelines.forEach(t => {
    t.style.width = TIMELINE_WIDTH + "px";
  });
}

// ====== CREATE BLOCK ======
function createBlock(trackIndex, text = "Dialog") {
  const block = document.createElement("div");
  block.className = "ls-block";
  block.textContent = text;

  block.style.left = "20px";
  block.style.width = "150px";

  block.dataset.start = 0;
  block.dataset.end = 1;

  enableBlockDrag(block);
  enableBlockResize(block);

  const trackTimeline = document.querySelector(
    `.ls-track[data-track-index="${trackIndex}"] .ls-track-timeline`
  );
  trackTimeline.appendChild(block);
}

// ====== DRAGGING ======
function enableBlockDrag(block) {
  let offsetX = 0;
  let dragging = false;

  block.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("resize-handle")) return;
    dragging = true;
    offsetX = e.clientX - block.offsetLeft;
    block.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    let newLeft = e.clientX - offsetX;
    newLeft = Math.max(0, Math.min(newLeft, TIMELINE_WIDTH - block.offsetWidth));
    block.style.left = newLeft + "px";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    block.style.cursor = "grab";
  });
}

// ====== RESIZING ======
function enableBlockResize(block) {
  const handle = document.createElement("div");
  handle.className = "resize-handle";
  handle.style.position = "absolute";
  handle.style.right = "0";
  handle.style.top = "0";
  handle.style.width = "10px";
  handle.style.height = "100%";
  handle.style.cursor = "ew-resize";
  block.appendChild(handle);

  let resizing = false;
  let startX = 0;

  handle.addEventListener("mousedown", (e) => {
    resizing = true;
    startX = e.clientX;
    e.stopPropagation();
  });

  document.addEventListener("mousemove", (e) => {
    if (!resizing) return;
    const delta = e.clientX - startX;
    let newWidth = block.offsetWidth + delta;
    newWidth = Math.max(BLOCK_MIN_WIDTH, newWidth);
    block.style.width = newWidth + "px";
    startX = e.clientX;
  });

  document.addEventListener("mouseup", () => {
    resizing = false;
  });
}

// ====== ADD BLOCK BUTTONS ======
function initAddBlockButtons() {
  const buttons = document.querySelectorAll(".ls-add-block-btn");
  buttons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const scriptInput = btn.parentElement.querySelector(".ls-script-input");
      const text = scriptInput.value.trim() || `Line ${index + 1}`;
      createBlock(index, text);
    });
  });
}

// ====== AUDIO UPLOAD ======
function initAudioUploads() {
  const inputs = document.querySelectorAll(".ls-audio-input");
  inputs.forEach((input, index) => {
    input.addEventListener("change", () => {
      statusBox.textContent = `Audio uploaded for Character ${index + 1}`;
    });
  });
}

// ====== VOICE GENERATION ======
function initVoiceGeneration() {
  const buttons = document.querySelectorAll(".ls-generate-voice-btn");

  buttons.forEach((btn, index) => {
    btn.addEventListener("click", async () => {
      const script = btn.parentElement.querySelector(".ls-script-input").value.trim();
      const voice = btn.parentElement.querySelector(".ls-voice-select").value;

      if (!script) {
        statusBox.textContent = "Enter dialog before generating voice.";
        return;
      }

      statusBox.textContent = "Generating voice...";

      // Send to backend later
      // const res = await fetch("/api/voice", {...})

      setTimeout(() => {
        statusBox.textContent = `Voice generated for Character ${index + 1}`;
      }, 800);
    });
  });
}

// ====== PLAYBACK ======
function initPlayback() {
  playBtn.addEventListener("click", () => {
    if (!previewVideo.src) {
      statusBox.textContent = "No reference video loaded.";
      return;
    }
    previewVideo.play();
    isPlaying = true;
    animateScrubber();
  });

  stopBtn.addEventListener("click", () => {
    previewVideo.pause();
    previewVideo.currentTime = 0;
    isPlaying = false;
    scrubber.style.left = "0px";
  });
}

function animateScrubber() {
  if (!isPlaying) return;

  const duration = previewVideo.duration || 1;
  const progress = previewVideo.currentTime / duration;
  const pos = progress * TIMELINE_WIDTH;

  scrubber.style.left = pos + "px";

  requestAnimationFrame(animateScrubber);
}

// ====== EXPORT TIMELINE ======
function initExport() {
  exportBtn.addEventListener("click", () => {
    const timeline = [];

    const tracks = document.querySelectorAll(".ls-track");
    tracks.forEach((track, index) => {
      const name = track.querySelector(".ls-char-name").value;
      const voice = track.querySelector(".ls-voice-select").value;
      const script = track.querySelector(".ls-script-input").value;

      const blocks = [...track.querySelectorAll(".ls-block")].map((b) => ({
        text: b.textContent,
        startPx: b.offsetLeft,
        widthPx: b.offsetWidth
      }));

      timeline.push({
        character: name,
        voice,
        script,
        blocks
      });
    });

    exportOutput.value = JSON.stringify(timeline, null, 2);
    statusBox.textContent = "Timeline exported.";
  });
}

// ====== VIDEO LOAD ======
videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];
  if (file) {
    previewVideo.src = URL.createObjectURL(file);
    statusBox.textContent = "Reference video loaded.";
  }
});

// ====== INIT ALL ======
initTimeline();
initAddBlockButtons();
initAudioUploads();
initVoiceGeneration();
initPlayback();
initExport();
