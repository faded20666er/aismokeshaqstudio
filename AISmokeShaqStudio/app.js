
// ===== DOM HOOKS =====
const modeSelect = document.getElementById("modeSelect");
const modelSelect = document.getElementById("modelSelect");
const voiceSelect = document.getElementById("voiceSelect");
const promptInput = document.getElementById("promptInput");
const scriptInput = document.getElementById("scriptInput");
const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
const audioInput = document.getElementById("audioInput");
const generateBtn = document.getElementById("generateBtn");
const outputContainer = document.getElementById("outputContainer");
const statusMessage = document.getElementById("statusMessage");
const creditsDisplay = document.getElementById("creditsDisplay");

const panelImage = document.getElementById("panelImage");
const panelVideo = document.getElementById("panelVideo");
const panelAudio = document.getElementById("panelAudio");
const panelScript = document.getElementById("panelScript");
const panelVoice = document.getElementById("panelVoice");

// ===== STATE =====
let pollingInterval = null;
let currentPredictionId = null;

// ===== UTIL =====
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
  const lower = (url || "").toLowerCase();
  if (lower.match(/\.(png|jpg|jpeg|webp)$/)) {
    const img = document.createElement("img");
    img.src = url;
    img.className = "dn-output-media";
    return img;
  }
  if (lower.match(/\.(mp4|webm|mov)$/)) {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.loop = true;
    video.className = "dn-output-media";
    return video;
  }
  if (lower.match(/\.(mp3|wav|ogg)$/)) {
    const audio = document.createElement("audio");
    audio.src = url;
    audio.controls = true;
    audio.className = "dn-output-media";
    return audio;
  }
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.textContent = "Download result";
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

// ===== MODE UI =====
function updateModeUI() {
  const mode = modeSelect ? modeSelect.value : "text2img";

  [panelImage, panelVideo, panelAudio, panelScript, panelVoice].forEach(p => {
    if (p) p.style.display = "none";
  });

  switch (mode) {
    case "text2img":
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
  }
}

// ===== CREDITS =====
async function updateCredits(userId = "guest") {
  try {
    const res = await fetch("/api/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: userId })
    });
    const data = await res.json();
    if (typeof data.credits === "number") setCredits(data.credits);
  } catch (err) {
    console.error("Credits error:", err);
  }
}

// ===== STATUS POLLING =====
async function pollStatus(id) {
  if (!id) return;
  currentPredictionId = id;

  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/status?id=${encodeURIComponent(id)}`);
      const data = await res.json();

      const status = data.status || data.state || "processing";

      if (["succeeded", "failed", "canceled"].includes(status)) {
        clearInterval(pollingInterval);
        setLoading(false);

        if (status === "succeeded") {
          renderOutput(data.output);
          setStatus("Done.");
          await updateCredits("guest");
        } else {
          setStatus(`Job ${status}`);
        }
      } else {
        setStatus(`Status: ${status}...`);
      }
    } catch (err) {
      console.error("Status polling error:", err);
      clearInterval(pollingInterval);
      setLoading(false);
      setStatus("Status check failed.");
    }
  }, 3000);
}

// ===== OUTPUT RENDER =====
function renderOutput(output) {
  clearOutput();
  if (!outputContainer) return;

  if (!output) {
    setStatus("No output received.");
    return;
  }

  const urls = Array.isArray(output) ? output : [output];
  urls.forEach(u => {
    if (!u) return;
    const el = createMediaElement(u);
    outputContainer.appendChild(el);
  });
}

// ===== MAIN GENERATE =====
async function handleGenerate() {
  const mode = modeSelect ? modeSelect.value : "text2img";
  const prompt = promptInput ? promptInput.value.trim() : "";
  const script = scriptInput ? scriptInput.value.trim() : "";
  const engine = modelSelect ? modelSelect.value : "";
  const voiceId = voiceSelect ? voiceSelect.value : "";

  if (!prompt && ["text2img", "img2img", "img2video", "video2video"].includes(mode)) {
    alert("Please enter a prompt.");
    return;
  }

  if (["lipsync_upload_audio", "lipsync_tts", "tts_only"].includes(mode) && !script) {
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

    const [imageBase64, videoBase64, audioBase64] = await Promise.all([
      fileToBase64(imageFile),
      fileToBase64(videoFile),
      fileToBase64(audioFile)
    ]);

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

// ===== VOICE PRESETS =====
function initVoices() {
  if (!voiceSelect) return;

  const voices = [
    { id: "coqui_female_1", label: "Coqui – Cinematic Female" },
    { id: "coqui_male_1", label: "Coqui – Cinematic Male" },
    { id: "openai_female_1", label: "OpenAI – Studio Female" },
    { id: "openai_male_1", label: "OpenAI – Studio Male" }
  ];

  voiceSelect.innerHTML = "";
  voices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    voiceSelect.appendChild(opt);
  });
}

// ===== INIT =====
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
