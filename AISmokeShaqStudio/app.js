
// ====== BASIC DOM HOOKS ======
const modeSelect = document.getElementById("modeSelect");          // <select>
const modelSelect = document.getElementById("modelSelect");        // optional <select> for engine/model
const voiceSelect = document.getElementById("voiceSelect");        // <select> for voice
const promptInput = document.getElementById("promptInput");        // textarea / input
const scriptInput = document.getElementById("scriptInput");        // textarea for dialog
const imageInput = document.getElementById("imageInput");          // <input type="file">
const videoInput = document.getElementById("videoInput");          // <input type="file">
const audioInput = document.getElementById("audioInput");          // <input type="file">
const generateBtn = document.getElementById("generateBtn");        // main CTA
const outputContainer = document.getElementById("outputContainer");// div for result
const statusMessage = document.getElementById("statusMessage");    // small status text
const creditsDisplay = document.getElementById("creditsDisplay");  // span for credits

// Panels you can show/hide per mode
const panelImage = document.getElementById("panelImage");
const panelVideo = document.getElementById("panelVideo");
const panelAudio = document.getElementById("panelAudio");
const panelScript = document.getElementById("panelScript");
const panelVoice = document.getElementById("panelVoice");

// ====== STATE ======
let currentPredictionId = null;
let pollingInterval = null;

// ====== UTILITIES ======
function setStatus(text) {
  if (statusMessage) statusMessage.textContent = text || "";
}

function setLoading(isLoading) {
  if (!generateBtn) return;
  generateBtn.disabled = isLoading;
  generateBtn.textContent = isLoading ? "Generating..." : "Generate";
}

function setCredits(value) {
  if (creditsDisplay && typeof value === "number") {
    creditsDisplay.textContent = value;
  }
}

function clearOutput() {
  if (!outputContainer) return;
  outputContainer.innerHTML = "";
}

function createMediaElement(url) {
  const lower = url.toLowerCase();
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
    const img = document.createElement("img");
    img.src = url;
    img.className = "output-media";
    return img;
  }
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.loop = true;
    video.className = "output-media";
    return video;
  }
  if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg")) {
    const audio = document.createElement("audio");
    audio.src = url;
    audio.controls = true;
    audio.className = "output-media";
    return audio;
  }
  const link = document.createElement("a");
  link.href = url;
  link.textContent = "Download result";
  link.target = "_blank";
  return link;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ====== MODE UI HANDLING ======
function updateModeUI() {
  const mode = modeSelect ? modeSelect.value : "text2img";

  // Hide all panels by default
  [panelImage, panelVideo, panelAudio, panelScript, panelVoice].forEach(p => {
    if (p) p.style.display = "none";
  });

  // Turn on what each mode needs
  switch (mode) {
    case "text2img":
      if (panelImage) panelImage.style.display = "none";
      if (panelScript) panelScript.style.display = "none";
      if (panelAudio) panelAudio.style.display = "none";
      if (panelVoice) panelVoice.style.display = "none";
      break;

    case "img2img":
      if (panelImage) panelImage.style.display = "block";
      break;

    case "img2video":
      if (panelImage) panelImage.style.display = "block";
      break;

    case "video2video":
      if (panelVideo) panelVideo.style.display = "block";
      break;

    case "lipsync_upload_audio":
      if (panelVideo) panelVideo.style.display = "block";
      if (panelAudio) panelAudio.style.display = "block";
      if (panelScript) panelScript.style.display = "block";
      break;

    case "lipsync_tts":
      if (panelVideo) panelVideo.style.display = "block";
      if (panelScript) panelScript.style.display = "block";
      if (panelVoice) panelVoice.style.display = "block";
      break;

    case "tts_only":
      if (panelScript) panelScript.style.display = "block";
      if (panelVoice) panelVoice.style.display = "block";
      break;

    default:
      break;
  }
}

// ====== BACKEND CALLS ======
async function updateCredits(userId = "guest") {
  try {
    const res = await fetch("/api/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: userId })
    });
    const data = await res.json();
    if (data && typeof data.credits === "number") {
      setCredits(data.credits);
    }
  } catch (err) {
    console.error("Credits error:", err);
  }
}

async function pollStatus(id) {
  if (!id) return;
  currentPredictionId = id;

  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/status?id=${encodeURIComponent(id)}`);
      const data = await res.json();

      if (data.status === "succeeded" || data.status === "failed" || data.status === "canceled") {
        clearInterval(pollingInterval);
        setLoading(false);

        if (data.status === "succeeded") {
          renderOutput(data.output);
          setStatus("Done.");
          await updateCredits("guest");
        } else {
          setStatus(`Job ${data.status}`);
        }
      } else {
        setStatus(`Status: ${data.status || "processing"}...`);
      }
    } catch (err) {
      console.error("Status polling error:", err);
      clearInterval(pollingInterval);
      setLoading(false);
      setStatus("Status check failed.");
    }
  }, 3000);
}

function renderOutput(output) {
  clearOutput();
  if (!outputContainer) return;

  if (!output) {
    setStatus("No output received.");
    return;
  }

  // Replicate often returns array of URLs
  const urls = Array.isArray(output) ? output : [output];

  urls.forEach((u) => {
    if (!u) return;
    const el = createMediaElement(u);
    outputContainer.appendChild(el);
  });
}

// ====== MAIN GENERATE HANDLER ======
async function handleGenerate() {
  const mode = modeSelect ? modeSelect.value : "text2img";
  const prompt = promptInput ? promptInput.value.trim() : "";
  const script = scriptInput ? scriptInput.value.trim() : "";
  const engine = modelSelect ? modelSelect.value : "";
  const voiceId = voiceSelect ? voiceSelect.value : "";

  if (!prompt && (mode === "text2img" || mode === "img2img" || mode === "img2video" || mode === "video2video")) {
    alert("Please enter a prompt.");
    return;
  }

  if ((mode === "lipsync_upload_audio" || mode === "lipsync_tts" || mode === "tts_only") && !script) {
    alert("Please enter dialog / script.");
    return;
  }

  clearOutput();
  setStatus("Preparing...");
  setLoading(true);

  try {
    const imageFile = imageInput && imageInput.files[0] ? imageInput.files[0] : null;
    const videoFile = videoInput && videoInput.files[0] ? videoInput.files[0] : null;
    const audioFile = audioInput && audioInput.files[0] ? audioInput.files[0] : null;

    const imageBase64 = await fileToBase64(imageFile);
    const videoBase64 = await fileToBase64(videoFile);
    const audioBase64 = await fileToBase64(audioFile);

    const body = {
      mode,
      prompt,
      script,
      engine,
      voiceId,
      image: imageBase64,
      video: videoBase64,
      audio: audioBase64
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Generate error:", data);
      setStatus(data.error || "Generation failed.");
      setLoading(false);
      return;
    }

    // Two possibilities:
    // 1) Synchronous output: data.output is ready
    // 2) Async: data.id (prediction id) to poll
    if (data.id) {
      setStatus("Job started. Polling status...");
      await pollStatus(data.id);
    } else if (data.output) {
      renderOutput(data.output);
      setStatus("Done.");
      setLoading(false);
      await updateCredits("guest");
    } else {
      setStatus("No output received.");
      setLoading(false);
    }
  } catch (err) {
    console.error("Generate exception:", err);
    setStatus("Unexpected error during generation.");
    setLoading(false);
  }
}

// ====== VOICE PRESET SETUP ======
function initVoices() {
  if (!voiceSelect) return;

  const voices = [
    { id: "default_female", label: "Diamond Noir – Female" },
    { id: "default_male", label: "Diamond Noir – Male" },
    { id: "gritty_male", label: "Gritty Narrator" },
    { id: "smooth_female", label: "Smooth Commercial" }
  ];

  voiceSelect.innerHTML = "";
  voices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    voiceSelect.appendChild(opt);
  });
}

// ====== INIT ======
function init() {
  if (modeSelect) {
    modeSelect.addEventListener("change", updateModeUI);
    updateModeUI();
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", handleGenerate);
  }

  initVoices();
  updateCredits("guest");
  setStatus("");
}

document.addEventListener("DOMContentLoaded", init);
