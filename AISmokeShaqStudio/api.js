// api.js
// Handles: startProduction(), poll(), file encoding, output rendering, credit updates

// ---------- FILE → BASE64 ENCODING ----------
async function encodeFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

// ---------- START PRODUCTION ----------
async function startProduction() {
    if (!userEmail) {
        openLogin();
        return;
    }

    const cost = parseInt(document.getElementById('costDisplay').innerText);
    if (userCredits < cost) {
        alert("Insufficient Credits. Please refill to continue production.");
        return;
    }

    // UI feedback
    document.getElementById('standbyText').classList.add('hidden');
    document.getElementById('activeRender').classList.remove('hidden');
    document.getElementById('resultContainer').innerHTML = '';

    try {
        const file = document.getElementById('assetFile').files[0];
        let b64 = null;

        if (file) {
            b64 = await encodeFile(file);
        }

        const payload = {
            tool: currentMode,
            modelId: document.getElementById('engineSelect').value,
            prompt: document.getElementById('studioPrompt').value,
            image: b64,
            email: userEmail,
            prompt_strength: parseFloat(document.getElementById('promptStrength').value),
            script: document.getElementById('scriptText').value
        };

        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Server connection failed");
        }

        const job = await res.json();
        poll(job.id);

    } catch (err) {
        console.error("PRODUCTION ERROR:", err);
        alert("PRODUCTION FAILED: " + err.message);

        document.getElementById('activeRender').classList.add('hidden');
        document.getElementById('standbyText').classList.remove('hidden');
    }
}

// ---------- POLLING ----------
function poll(jobId) {
    const timer = setInterval(async () => {
        try {
            const res = await fetch(`/api/status?id=${jobId}`);
            if (!res.ok) return;

            const data = await res.json();

            if (data.status === 'succeeded') {
                clearInterval(timer);
                renderOutput(data.output);
                updateCredits();
            }

            if (data.status === 'failed') {
                clearInterval(timer);
                alert("The AI Engine failed to generate this prompt. Credits were not deducted.");

                document.getElementById('activeRender').classList.add('hidden');
                document.getElementById('standbyText').classList.remove('hidden');
            }

        } catch (err) {
            console.warn("Polling error, retrying...", err);
        }
    }, 3000);
}

// ---------- RENDER OUTPUT ----------
function renderOutput(output) {
    const container = document.getElementById('resultContainer');
    const active = document.getElementById('activeRender');

    active.classList.add('hidden');

    const url = Array.isArray(output) ? output[0] : output;

    if (!url) {
        container.innerHTML = `<p style="color:red;">No output returned.</p>`;
        return;
    }

    // Video output
    if (url.includes('.mp4') || url.includes('.webm')) {
        container.innerHTML = `
            <video src="${url}" controls autoplay loop style="width:100%; border-radius:10px;"></video>
            <div style="padding:15px; text-align:center;">
                <a href="${url}" download class="btn-outline" style="display:inline-block;">DOWNLOAD MASTER VIDEO</a>
            </div>
        `;
        return;
    }

    // Image output
    container.innerHTML = `
        <img src="${url}" style="width:100%; border-radius:10px;">
        <div style="padding:15px; text-align:center;">
            <a href="${url}" download class="btn-outline" style="display:inline-block;">DOWNLOAD MASTER IMAGE</a>
        </div>
    `;
}

// ---------- EXPOSE FUNCTIONS ----------
window.startProduction = startProduction;
