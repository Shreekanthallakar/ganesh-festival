/**
 * Ganesh Festival Gallery — Admin Backend (Node.js / Express)
 * =============================================================
 *
 * This is the only piece of the project that needs a real server
 * (GitHub Pages can't run Node). It is protected by an admin key and
 * does exactly two things, committing straight to YOUR OWN GitHub
 * repo — no third-party storage involved:
 *
 *   1. Upload a photo  -> commits it to images/<year>_<name>_<ts>.ext
 *                          in your repo, then updates images/manifest.json
 *   2. Delete a photo   -> removes it from the repo and updates the
 *                          manifest
 *
 * Every commit it makes is picked up automatically by GitHub Pages, so
 * the public site updates within about a minute of an upload/delete.
 *
 * -------------------------------------------------------------------
 * REQUIRED ENVIRONMENT VARIABLES (set these on Render, NOT in code):
 *
 *   ADMIN_KEY        - secret key typed into the website to unlock
 *                       upload/delete
 *   GITHUB_TOKEN      - a GitHub Fine-grained Personal Access Token
 *                       with "Contents: Read and write" permission,
 *                       scoped to ONLY your gallery repo
 *   GITHUB_REPO       - "your-username/your-repo-name"
 *   GITHUB_BRANCH     - usually "main"
 *   FRONTEND_ORIGIN   - your GitHub Pages URL, e.g.
 *                       https://your-username.github.io
 *                       (use "*" while testing)
 * -------------------------------------------------------------------
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const crypto = require("crypto");

const app = express();

const ADMIN_KEY = process.env.ADMIN_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

const GITHUB_API = "https://api.github.com";
const IMAGES_DIR = "images";
const MANIFEST_PATH = `${IMAGES_DIR}/manifest.json`;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

function checkConfig() {
  const missing = [
    ["ADMIN_KEY", ADMIN_KEY],
    ["GITHUB_TOKEN", GITHUB_TOKEN],
    ["GITHUB_REPO", GITHUB_REPO],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function validKey(supplied) {
  if (!ADMIN_KEY || !supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_KEY);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isValidYear(year) {
  return /^20\d{2}$/.test(year || "");
}

function sanitizeFilename(name) {
  const cleaned = (name || "photo").trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_.-]/g, "");
  return cleaned || "photo";
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ganesh-festival-gallery-backend",
  };
}

async function getGithubFile(path) {
  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const resp = await fetch(url, { headers: ghHeaders() });
  if (resp.status === 404) return { sha: null, content: null };
  if (!resp.ok) throw new Error(`GitHub GET failed (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { sha: data.sha, content };
}

async function putGithubFile(path, buffer, message, sha) {
  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}`;
  const body = {
    message,
    content: buffer.toString("base64"),
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const resp = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`GitHub PUT failed (${resp.status}): ${await resp.text()}`);
  return resp.json();
}

async function deleteGithubFile(path, sha, message) {
  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}`;
  const resp = await fetch(url, {
    method: "DELETE",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: GITHUB_BRANCH }),
  });
  if (!resp.ok) throw new Error(`GitHub DELETE failed (${resp.status}): ${await resp.text()}`);
  return resp.json();
}

async function loadManifest() {
  const { sha, content } = await getGithubFile(MANIFEST_PATH);
  if (content === null) return { sha: null, manifest: {} };
  try {
    return { sha, manifest: JSON.parse(content) };
  } catch {
    return { sha, manifest: {} };
  }
}

async function saveManifest(manifest, sha, message) {
  const body = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
  return putGithubFile(MANIFEST_PATH, body, message, sha);
}

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "ganesh-festival-gallery-backend" });
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    checkConfig();

    const { key, year } = req.body;

    if (!validKey(key)) return res.status(401).json({ error: "Invalid admin key" });
    if (!isValidYear(year)) return res.status(400).json({ error: "Year must look like e.g. 2026" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return res.status(400).json({ error: `File type .${ext} not allowed` });
    }

    const baseName = sanitizeFilename(req.file.originalname.replace(/\.[^/.]+$/, ""));
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const filename = `${year}_${baseName}_${timestamp}.${ext}`;
    const repoPath = `${IMAGES_DIR}/${filename}`;

    await putGithubFile(repoPath, req.file.buffer, `Add gallery photo ${filename}`);

    const { sha, manifest } = await loadManifest();
    manifest[year] = Array.from(new Set([...(manifest[year] || []), filename])).sort();
    await saveManifest(manifest, sha, `Update manifest: add ${filename}`);

    res.json({ ok: true, filename, manifest });
  } catch (err) {
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

app.post("/api/delete", async (req, res) => {
  try {
    checkConfig();

    const { key, year, filename } = req.body || {};

    if (!validKey(key)) return res.status(401).json({ error: "Invalid admin key" });
    if (!year || !filename) return res.status(400).json({ error: "year and filename are required" });
    if (!filename.startsWith(`${year}_`) || filename.includes("/") || filename.includes("..")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const repoPath = `${IMAGES_DIR}/${filename}`;
    const { sha } = await getGithubFile(repoPath);
    if (!sha) return res.status(404).json({ error: "File not found" });

    await deleteGithubFile(repoPath, sha, `Delete gallery photo ${filename}`);

    const { sha: mSha, manifest } = await loadManifest();
    if (manifest[year]) {
      manifest[year] = manifest[year].filter((f) => f !== filename);
      if (manifest[year].length === 0) delete manifest[year];
    }
    await saveManifest(manifest, mSha, `Update manifest: remove ${filename}`);

    res.json({ ok: true, manifest });
  } catch (err) {
    res.status(500).json({ error: err.message || "Delete failed" });
  }
});

// Multer / general error handler
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || "Request error" });
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Ganesh Festival gallery backend running on port ${PORT}`);
});
