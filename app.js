// app.js
// Core UI logic: modes, engines, guides, cost, initial setup

let currentMode = 'img-to-img';
let userEmail = localStorage.getItem('studio_email') || null;
let userCredits = 0;

// Guides per mode
const guides = {
    'img-to-img': `<b>IMAGE TIPS:</b><br>1. Use 0.85 Preservation.<br>2. Use 'Logo' for branding results.<br>3. Upload clean, high-res assets.`,
    'img-to-video': `<b>VIDEO TIPS:</b><br>1. Mention camera motion (pan, dolly, zoom).<br>2. Describe mood + lighting.<br>3. Short, clear prompts work best.`,
    'lip-sync': `<b>LIP SYNC TIPS:</b><br>1. Use clear, front-facing headshots.<br>2. Keep audio clean and dry.<br>3. Match script timing to speech pace.`
};

// Engine library per mode
const modelLibrary = {
    'img-to-img': [
        { id: 'flux-pro', name: 'FLUX 1.1 PRO', cost: 5 }
    ],
    'img-to-video': [
        { id: 'kling-video', name: 'KLING 2.5', cost: 15 }
    ],
    'lip-sync': [
        { id: 'omni-human', name: 'OMNI-HUMAN', cost: 20 }
    ]
};

// ---------- MODE HANDLING ----------

function setMode(mode) {
    currentMode = mode;

    // Nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        const m = item.getAttribute('data-mode');
        if (m === mode) item.classList.add('active');
        else item.classList.remove('active');
    });

    // Show/hide controls based on mode
    const sliderControl = document.getElementById('sliderControl');
    const timelineContainer = document.getElementById('timelineContainer');

    if (mode === 'img-to-img') {
        sliderControl.classList.remove('hidden');
        timelineContainer.classList.add('hidden');
    } else if (mode === 'img-to-video') {
        sliderControl.classList.add('hidden');
        timelineContainer.classList.add('hidden');
    } else if (mode === 'lip-sync') {
        sliderControl.classList.add('hidden');
        timelineContainer.classList.remove('hidden');
    }

    // Update guide + engines
    updateGuide();
    updateEngineDropdown();
}

function updateGuide() {
    const guideBox = document.getElementById('dynamicGuide');
    if (!guideBox) return;
    guideBox.innerHTML = guides[currentMode] || '';
}

function updateEngineDropdown() {
    const select = document.getElementById('engineSelect');
    if (!select) return;

    const models = modelLibrary[currentMode] || [];
    select.innerHTML = models
        .map(m => `<option value="${m.id}">${m.name}</option>`)
        .join('');

    updateCost();
}

function updateCost() {
    const select = document.getElementById('engineSelect');
    const costDisplay = document.getElementById('costDisplay');
    if (!select || !costDisplay) return;

    const models = modelLibrary[currentMode] || [];
    const selected = models.find(m => m.id === select.value);
    if (selected) costDisplay.innerText = selected.cost;
}

// ---------- PROMPT UTILITIES ----------

function pimpPrompt() {
    const area = document.getElementById('studioPrompt');
    if (!area) return;

    let base = area.value || 'Professional masterpiece';
    let lower = base.toLowerCase();

    let enhanced = lower.includes('logo')
        ? `${base}, 3D metallic logo, smoke, 8k --no human --no face`
        : `${base}, hyper-realistic, cinematic lighting, 8k, detailed, studio-grade`;

    area.value = enhanced;
}

// ---------- CREDITS (UI SIDE ONLY, API IN api.js) ----------

async function updateCredits() {
    if (!userEmail) return;
    try {
        const res = await fetch(`/api/credits?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        userCredits = data.credits || 0;

        // One-time gift
        const giftKey = 'gift_claimed_' + userEmail;
        if (userCredits === 0 && !localStorage.getItem(giftKey)) {
            userCredits = 50;
            localStorage.setItem(giftKey, 'true');
        }

        const liveCredits = document.getElementById('liveCredits');
        if (liveCredits) liveCredits.innerText = userCredits;
    } catch (e) {
        console.log('Credit sync standby...', e);
    }
}

// ---------- LOGIN UI HOOKS (logic in ui.js) ----------

function loginUI(email) {
    const authBtn = document.getElementById('authBtn');
    const userPanel = document.getElementById('userPanel');
    const userHandle = document.getElementById('userHandle');

    if (authBtn) authBtn.classList.add('hidden');
    if (userPanel) userPanel.classList.remove('hidden');
    if (userHandle) userHandle.innerText = email;
}

function logout() {
    localStorage.removeItem('studio_email');
    window.location.reload();
}

// ---------- INITIALIZATION ----------

function initNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const mode = item.getAttribute('data-mode');
            if (mode) setMode(mode);
        });
    });
}

function initApp() {
    initNav();
    setMode('img-to-img');      // default mode
    updateEngineDropdown();     // populate engines
    updateGuide();              // set initial guide

    if (userEmail) {
        loginUI(userEmail);
        updateCredits();
    }
}

// Run after DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Expose some functions globally for HTML onclick hooks
window.pimpPrompt = pimpPrompt;
window.logout = logout;
window.updateCredits = updateCredits;
window.loginUI = loginUI;
