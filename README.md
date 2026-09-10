# Our Ganesh Festival — Website + Photo Gallery (Node.js, images in your own GitHub repo)

A festival website with a members list, event program, and a year-wise
photo gallery you (the admin) can update from anywhere — phone or laptop —
protected by an admin key. **All images live in your own GitHub repo** —
no third-party storage service is used.

```
ganesh-festival-node-github/
├── index.html            ┐
├── style.css               ├─ FRONTEND — deploy these with GitHub Pages
├── script.js                │
├── images/                  │
│   └── manifest.json      ┘   (auto-updated by the backend; starts empty)
└── backend/                ── BACKEND — deploy this on Render (Node.js)
    ├── server.js
    ├── package.json
    └── .env.example
```

**Why two deployments?** GitHub Pages only hosts static files — it can't
run a Node server. So `backend/` runs on a free always-on host and talks
to your GitHub repo through the GitHub API. Every upload/delete is a
normal git commit, so GitHub Pages picks it up automatically within
about a minute — no other service is involved anywhere.

---

## Part 1 — Put the site on GitHub Pages

1. Create a new **public** GitHub repository, e.g. `ganesh-festival`.
2. Upload the contents of this folder to the repo **root** — `index.html`,
   `style.css`, `script.js`, and the `images/` folder go directly in the
   repo (not inside a subfolder). `backend/` can live in the same repo too.
   ```bash
   git init
   git add index.html style.css script.js images backend README.md .gitignore
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/ganesh-festival.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`. Save.
5. Your site will be live at
   `https://YOUR-USERNAME.github.io/ganesh-festival/` within a minute or two.

---

## Part 2 — Create a GitHub token for the backend

1. Go to **github.com → Settings → Developer settings → Personal access
   tokens → Fine-grained tokens → Generate new token**.
2. **Repository access:** "Only select repositories" → choose your
   `ganesh-festival` repo.
3. **Permissions → Repository permissions → Contents:** set to
   **Read and write**. Leave everything else as default (No access).
4. Generate the token and copy it immediately (you won't see it again).

This token can only touch this one repo's files — it cannot access your
other repositories or account settings.

---

## Part 3 — Deploy the Node backend on Render (free)

1. Go to [render.com](https://render.com) and sign up (free tier is fine).
2. Click **New → Web Service**, and connect the same GitHub repo.
3. Configure it:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. Under **Environment → Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `ADMIN_KEY` | any secret word/phrase you'll type on the site, e.g. `Ganesha@2026` |
   | `GITHUB_TOKEN` | the token from Part 2 |
   | `GITHUB_REPO` | `YOUR-USERNAME/ganesh-festival` |
   | `GITHUB_BRANCH` | `main` |
   | `FRONTEND_ORIGIN` | `https://YOUR-USERNAME.github.io` |

5. Click **Create Web Service**. Render builds and deploys it, giving you
   a URL like `https://ganesh-festival-backend.onrender.com`.

   > Free Render services "sleep" after 15 minutes of no traffic and take
   > ~30–50 seconds to wake up on the next request — normal behavior.

---

## Part 4 — Connect the frontend to your backend

Open `script.js` and change the very first line:

```js
const BACKEND_URL = "https://YOUR-BACKEND-NAME.onrender.com"; // <-- change me
```

to your actual Render URL from Part 3. Commit and push this one code
change — GitHub Pages will redeploy automatically.

---

## How it works day-to-day

- **Visitors** just see the site and browse the gallery — no login needed.
- **You (admin)**: open the site → Gallery → **View Full Gallery** →
  **Upload**. Enter your admin key once, pick the year and an image file,
  and upload. The backend commits it straight to your GitHub repo; the
  public site reflects it within roughly a minute.
- **Deleting**: in the full gallery view, click **Delete Mode**, enter the
  admin key if asked, then click the ✕ on any photo to remove it.
- Click **🔒 Lock** to require the admin key again (e.g. before handing
  your phone to someone else).
- Photos are stored in `images/` with filenames like
  `2026_diwali_20260910120000.jpg` — the year prefix powers the year
  selector. `images/manifest.json` is the index the site reads; the
  backend keeps it in sync automatically, so you never edit it by hand.

## Notes & limits

- Max upload size: 8 MB per photo (adjust `MAX_FILE_BYTES` in
  `backend/server.js` if you need more).
- Allowed file types: jpg, jpeg, png, webp, gif.
- The admin key is a single shared secret (as requested) — simple, but
  anyone who has it can upload/delete. Don't share it publicly.
- Because photos are real git commits, your repo will grow over time as
  you add yearly photos — fine for typical festival-photo volumes, but
  worth knowing if you plan to upload thousands of large images.
- A new upload takes effect on the live site once GitHub Pages finishes
  rebuilding (usually under a minute); there's a short delay right after
  uploading before it's visible to other visitors.
