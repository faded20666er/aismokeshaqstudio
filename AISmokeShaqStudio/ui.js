// ui.js
// Handles: login modal, chat window, chat messages, UI toggles, prompt injection

// ---------- LOGIN MODAL ----------

function openLogin() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('hidden');
}

function closeLogin() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('hidden');
}

function processLogin() {
    const emailInput = document.getElementById('loginEmail');
    if (!emailInput) return;

    const email = emailInput.value.trim().toLowerCase();
    if (!email.includes('@')) {
        alert("Invalid email address");
        return;
    }

    // Save login
    localStorage.setItem('studio_email', email);
    userEmail = email;

    // Update UI
    loginUI(email);
    updateCredits();
    closeLogin();
}

// ---------- CHAT WINDOW ----------

function toggleChat() {
    const win = document.getElementById('aiChatWindow');
    if (!win) return;

    if (win.classList.contains('hidden')) {
        win.classList.remove('hidden');
    } else {
        win.classList.add('hidden');
    }
}

// ---------- CHAT MESSAGE SYSTEM ----------

function sendChat() {
    const input = document.getElementById('chatInput');
    const body = document.getElementById('chatBody');

    if (!input || !body) return;

    const text = input.value.trim();
    if (!text) return;

    // Render user message
    body.innerHTML += `
        <div style="text-align:right; color:var(--gold); margin-bottom:10px;">
            ${escapeHTML(text)}
        </div>
    `;

    // Auto-scroll
    body.scrollTop = body.scrollHeight;

    // Generate AI response
    let response = "I'm ready. I help with Logos, Characters, and Scene Prompts.";

    const lower = text.toLowerCase();

    if (lower.includes("logo")) {
        const p = `3D metallic logo, smoke, 8k --no human --no face`;
        response = `
            <b>LOGO PROMPT:</b><br>
            "${p}"<br>
            <button class="use-btn" onclick="applyPrompt('${p}')">Apply</button>
        `;
    }

    if (lower.includes("character")) {
        const p = `hyper-realistic character portrait, cinematic lighting, 8k, detailed skin texture`;
        response = `
            <b>CHARACTER PROMPT:</b><br>
            "${p}"<br>
            <button class="use-btn" onclick="applyPrompt('${p}')">Apply</button>
        `;
    }

    if (lower.includes("scene")) {
        const p = `cinematic wide shot, dramatic lighting, volumetric smoke, 8k, film-grade composition`;
        response = `
            <b>SCENE PROMPT:</b><br>
            "${p}"<br>
            <button class="use-btn" onclick="applyPrompt('${p}')">Apply</button>
        `;
    }

    // Render AI response after delay
    setTimeout(() => {
        body.innerHTML += `<div class="ai-msg">${response}</div>`;
        body.scrollTop = body.scrollHeight;
    }, 500);

    input.value = "";
}

// ---------- APPLY PROMPT TO STUDIO ----------

function applyPrompt(p) {
    const area = document.getElementById('studioPrompt');
    if (area) area.value = p;
}

// ---------- UTILITY: SAFE HTML ----------

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

// ---------- EXPOSE FUNCTIONS GLOBALLY ----------

window.openLogin = openLogin;
window.closeLogin = closeLogin;
window.processLogin = processLogin;

window.toggleChat = toggleChat;
window.sendChat = sendChat;
window.applyPrompt = applyPrompt;
