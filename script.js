const API_URL = 'https://webscraper-backend-5pam.onrender.com';

let scrapedText = "";

function showAlert(message, type = "error") {
    const alertBox = document.getElementById("alertBox");
    const alertClass =
        type === "success" ? "alert-success" :
        type === "info" ? "alert-info" :
        "alert-error";

    alertBox.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;

    setTimeout(() => alertBox.innerHTML = "", 5000);
}

function setUrl(url) {
    document.getElementById("urlInput").value = url;
    showAlert("URL set! Click 'Scrape Website' to start.", "info");
}

async function scrapeWebsite() {
    const url = document.getElementById("urlInput").value.trim();
    const btn = document.getElementById("scrapeBtn");

    if (!url) return showAlert("❌ Enter a URL");

    try {
        new URL(url);
    } catch {
        return showAlert("❌ Invalid URL format");
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="loading"></span> Scraping...`;

    try {
        const res = await fetch(`${API_URL}/scrape`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        const data = await res.json();

        if (data.success) {
            scrapedText = data.text;
            document.getElementById("scrapedData").value = scrapedText;
            document.getElementById("wordCount").textContent = data.wordCount;
            document.getElementById("charCount").textContent = scrapedText.length;

            document.getElementById("scrapedSection").classList.remove("hidden");
            showAlert("✅ Scraped successfully!", "success");
        } else {
            showAlert(data.error);
        }
    } catch (err) {
        showAlert("❌ Backend not running");
    }

    btn.disabled = false;
    btn.innerHTML = "Scrape Website";
}

async function encryptData() {
    const key = document.getElementById("encryptKey").value.trim();

    if (!scrapedText) return showAlert("❌ Scrape first");
    if (key.length < 8) return showAlert("❌ Key must be 8 chars");

    try {
        const res = await fetch(`${API_URL}/encrypt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: scrapedText, key })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById("encryptedData").value = data.encrypted;
            document.getElementById("encryptedSection").classList.remove("hidden");

            await fetch(`${API_URL}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: document.getElementById("urlInput").value,
                    originalText: scrapedText,
                    encryptedText: data.encrypted,
                    encryptionKey: key
                })
            });

            showAlert("✅ Data encrypted & saved!", "success");
        }
    } catch {
        showAlert("❌ Encryption failed");
    }
}

async function decryptData() {
    const encrypted = document.getElementById("encryptedData").value;
    const key = document.getElementById("encryptKey").value.trim();

    if (!encrypted) return showAlert("❌ Encrypt first");
    if (!key) return showAlert("❌ Enter key");

    try {
        const res = await fetch(`${API_URL}/decrypt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: encrypted, key })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById("decryptedData").value = data.decrypted;
            document.getElementById("decryptedSection").classList.remove("hidden");
            showAlert("✅ Decrypted successfully!", "success");
        } else {
            showAlert("❌ Wrong key");
        }
    } catch {
        showAlert("❌ Decryption failed");
    }
}

async function loadSavedItems() {
    try {
        const res = await fetch(`${API_URL}/items`);
        const data = await res.json();

        const container = document.getElementById("savedItems");
        container.innerHTML = "";

        data.forEach(item => {
            container.innerHTML += `
                <div class="item">
                    <p><strong>URL:</strong> ${item.url}</p>
                    <p><strong>Key:</strong> ${item.encryptionKey}</p>
                    <p><strong>Date:</strong> ${new Date(item.createdAt).toLocaleString()}</p>
                </div>
            `;
        });

        showAlert("Loaded saved items!", "success");
    } catch {
        showAlert("❌ Backend not running");
    }
}

function downloadData(id, filename) {
    const text = document.getElementById(id).value;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}


