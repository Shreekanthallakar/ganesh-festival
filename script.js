/* ============================================================
   CONFIG — edit this after you deploy your backend on Render
   ============================================================ */
const BACKEND_URL = "https://YOUR-BACKEND-NAME.onrender.com"; // <-- change me

/* ================= COUNTDOWN ================= */

// Change this to your Ganesh Chaturthi date and time.
const festivalDate = new Date("2026-09-14T09:00:00").getTime();

function updateCountdown() {
    const now = new Date().getTime();
    const distance = festivalDate - now;

    if (distance <= 0) {
        ["days", "hours", "minutes", "seconds"].forEach((id) => {
            document.getElementById(id).innerText = "00";
        });
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").innerText = String(days).padStart(2, "0");
    document.getElementById("hours").innerText = String(hours).padStart(2, "0");
    document.getElementById("minutes").innerText = String(minutes).padStart(2, "0");
    document.getElementById("seconds").innerText = String(seconds).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ================= MEMBERS MODAL ================= */
/* Hardcoded list of 20 members — replace with real names anytime. */

const members = [
    "Member 1", "Member 2", "Member 3", "Member 4", "Member 5",
    "Member 6", "Member 7", "Member 8", "Member 9", "Member 10",
    "Member 11", "Member 12", "Member 13", "Member 14", "Member 15",
    "Member 16", "Member 17", "Member 18", "Member 19", "Member 20"
];

function renderMembers() {
    const list = document.getElementById("membersList");
    list.innerHTML = "";
    members.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        list.appendChild(li);
    });
}

function openMembersModal() {
    renderMembers();
    document.getElementById("membersModal").classList.add("active");
}

function closeMembersModal() {
    document.getElementById("membersModal").classList.remove("active");
}

document.getElementById("membersModal").addEventListener("click", function (e) {
    if (e.target === this) closeMembersModal();
});

/* ================= GALLERY STATE ================= */

let manifest = {};          // { "2026": ["2026_x.jpg", ...], "2025": [...] }
let currentYear = null;     // currently selected year (string)
let adminKey = null;        // held in memory only, never stored on disk
let deleteMode = false;

const yearSelect = document.getElementById("yearSelect");
const lightboxYearSelect = document.getElementById("lightboxYearSelect");
const carousel = document.getElementById("carousel");
const lightboxGrid = document.getElementById("lightboxGrid");
const galleryEmptyMsg = document.getElementById("galleryEmptyMsg");

function imageUrl(filename) {
    // Relative path — works once GitHub Pages has picked up the commit.
    return `images/${filename}`;
}

async function loadManifest() {
    try {
        const res = await fetch(`images/manifest.json?t=${Date.now()}`);
        manifest = await res.json();
    } catch (err) {
        manifest = {};
    }
    const years = Object.keys(manifest).sort((a, b) => b - a); // newest first

    [yearSelect, lightboxYearSelect].forEach((sel) => {
        sel.innerHTML = "";
        years.forEach((y) => {
            const opt = document.createElement("option");
            opt.value = y;
            opt.textContent = y;
            sel.appendChild(opt);
        });
    });

    currentYear = years[0] || null;
    if (currentYear) {
        yearSelect.value = currentYear;
        lightboxYearSelect.value = currentYear;
    }

    renderCarousel();
}

function renderCarousel() {
    carousel.innerHTML = "";
    const files = (manifest[currentYear] || []);

    galleryEmptyMsg.style.display = files.length ? "none" : "block";

    files.forEach((filename) => {
        const item = document.createElement("div");
        item.className = "carousel-item";
        item.onclick = () => openLightbox(currentYear);

        const img = document.createElement("img");
        img.src = imageUrl(filename);
        img.alt = filename;
        img.loading = "lazy";

        item.appendChild(img);
        carousel.appendChild(item);
    });
}

function scrollCarousel(direction) {
    carousel.scrollBy({ left: direction * 280, behavior: "smooth" });
}

yearSelect.addEventListener("change", () => {
    currentYear = yearSelect.value;
    renderCarousel();
});

lightboxYearSelect.addEventListener("change", () => {
    currentYear = lightboxYearSelect.value;
    yearSelect.value = currentYear;
    renderLightboxGrid();
});

/* ================= LIGHTBOX (full gallery view) ================= */

function openLightbox(year) {
    currentYear = year || currentYear;
    if (currentYear) lightboxYearSelect.value = currentYear;
    renderLightboxGrid();
    document.getElementById("lightboxOverlay").classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeLightbox() {
    document.getElementById("lightboxOverlay").classList.remove("active");
    document.body.style.overflow = "";
}

function renderLightboxGrid() {
    lightboxGrid.innerHTML = "";
    const files = (manifest[currentYear] || []);

    files.forEach((filename) => {
        const item = document.createElement("div");
        item.className = "lightbox-item";

        const img = document.createElement("img");
        img.src = imageUrl(filename);
        img.alt = filename;
        img.loading = "lazy";

        const caption = document.createElement("div");
        caption.className = "caption";
        caption.textContent = filename;

        const delBtn = document.createElement("button");
        delBtn.className = "delete-badge";
        delBtn.innerHTML = "&times;";
        delBtn.title = "Delete this photo";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            handleDelete(filename);
        };

        item.appendChild(img);
        item.appendChild(caption);
        item.appendChild(delBtn);
        lightboxGrid.appendChild(item);
    });
}

/* ================= ADMIN: KEY PROMPT ================= */

function ensureAdminKey(callback) {
    if (adminKey) {
        callback();
        return;
    }
    document.getElementById("adminKeyError").textContent = "";
    document.getElementById("adminKeyInput").value = "";
    document.getElementById("adminKeyModal").classList.add("active");
    document.getElementById("adminKeyModal").dataset.onSuccess = "";
    window._pendingAdminAction = callback;
}

function closeAdminKeyModal() {
    document.getElementById("adminKeyModal").classList.remove("active");
}

function submitAdminKey() {
    const key = document.getElementById("adminKeyInput").value.trim();
    if (!key) {
        document.getElementById("adminKeyError").textContent = "Please enter the admin key.";
        return;
    }
    adminKey = key;
    closeAdminKeyModal();
    if (window._pendingAdminAction) {
        window._pendingAdminAction();
        window._pendingAdminAction = null;
    }
}

function lockAdmin() {
    adminKey = null;
    deleteMode = false;
    document.getElementById("lightboxOverlay").classList.remove("delete-mode");
    updateAdminButtons();
}

function updateAdminButtons() {
    const toggleBtn = document.getElementById("deleteModeBtn");
    toggleBtn.textContent = deleteMode ? "Exit Delete Mode" : "Delete Mode";
    toggleBtn.classList.toggle("danger", deleteMode);
}

/* ================= ADMIN: UPLOAD ================= */

function openUploadForm() {
    ensureAdminKey(() => {
        document.getElementById("uploadYear").value = currentYear || new Date().getFullYear();
        document.getElementById("uploadFile").value = "";
        document.getElementById("uploadStatus").textContent = "";
        document.getElementById("uploadError").textContent = "";
        document.getElementById("uploadModal").classList.add("active");
    });
}

function closeUploadModal() {
    document.getElementById("uploadModal").classList.remove("active");
}

async function submitUpload() {
    const year = document.getElementById("uploadYear").value.trim();
    const fileInput = document.getElementById("uploadFile");
    const file = fileInput.files[0];
    const statusEl = document.getElementById("uploadStatus");
    const errorEl = document.getElementById("uploadError");

    errorEl.textContent = "";
    statusEl.textContent = "";

    if (!/^20\d{2}$/.test(year)) {
        errorEl.textContent = "Please enter a valid year, e.g. 2026.";
        return;
    }
    if (!file) {
        errorEl.textContent = "Please choose an image file.";
        return;
    }

    statusEl.textContent = "Uploading… this can take a few seconds.";

    const formData = new FormData();
    formData.append("key", adminKey);
    formData.append("year", year);
    formData.append("file", file);

    try {
        const res = await fetch(`${BACKEND_URL}/api/upload`, {
            method: "POST",
            body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 401) adminKey = null; // wrong key — force re-entry next time
            errorEl.textContent = data.error || "Upload failed.";
            statusEl.textContent = "";
            return;
        }

        manifest = data.manifest;
        currentYear = year;

        statusEl.textContent = "Uploaded! It will appear on the live site shortly.";
        renderCarousel();
        if (document.getElementById("lightboxOverlay").classList.contains("active")) {
            lightboxYearSelect.value = currentYear;
            renderLightboxGrid();
        }
        [yearSelect, lightboxYearSelect].forEach((sel) => {
            if (![...sel.options].some((o) => o.value === year)) {
                const opt = document.createElement("option");
                opt.value = year;
                opt.textContent = year;
                sel.prepend(opt);
            }
            sel.value = year;
        });

        setTimeout(closeUploadModal, 1200);
    } catch (err) {
        errorEl.textContent = "Could not reach the server. Please try again.";
        statusEl.textContent = "";
    }
}

/* ================= ADMIN: DELETE ================= */

function toggleDeleteMode() {
    ensureAdminKey(() => {
        deleteMode = !deleteMode;
        document.getElementById("lightboxOverlay").classList.toggle("delete-mode", deleteMode);
        updateAdminButtons();
    });
}

async function handleDelete(filename) {
    if (!adminKey) return;
    if (!confirm(`Delete ${filename}? This cannot be undone.`)) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: adminKey, year: currentYear, filename }),
        });
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 401) adminKey = null;
            alert(data.error || "Delete failed.");
            return;
        }

        manifest = data.manifest;
        renderCarousel();
        renderLightboxGrid();
    } catch (err) {
        alert("Could not reach the server. Please try again.");
    }
}

/* ================= INIT ================= */

document.getElementById("lightboxOverlay").addEventListener("click", (e) => {
    if (e.target.id === "lightboxOverlay") closeLightbox();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeLightbox();
        closeMembersModal();
        closeAdminKeyModal();
        closeUploadModal();
    }
});

loadManifest();
