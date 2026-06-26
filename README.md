# Blend Learning Hub — Simple Edition

A single-server learning hub for the Blend PM team. **No login. No passwords. No access codes.** Anyone with the URL can view content, edit modules, track progress, and earn certificates.

---

## ✨ What's inside

- **3 learning tracks** — Foundation, Advanced Delivery, Enterprise Transformation
- **97+ lessons** with videos and curated learning material links
- **Shared content** — when one person edits a module, everyone sees the change
- **Per-user progress** — each person's progress is tracked separately by their name
- **Certificates** — auto-generated PDF when a track is 100% complete (Foundation + Advanced + Enterprise)
- **No authentication** — every visitor just enters their name once

---

## 🚀 Quick start (3 minutes)

### Requirements
- **Node.js 18 or higher** — download from [nodejs.org](https://nodejs.org)

### Setup
```bash
# 1. Unzip this folder anywhere on your computer
# 2. Open a terminal in the folder
cd blend-simple/server

# 3. Install dependencies (one-time, takes ~30 seconds)
npm install

# 4. Start the server
npm start
```

You'll see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Blend Learning Hub running
  Open: http://localhost:3000
  No login required — anyone can view & edit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Open **http://localhost:3000** in your browser. The first visit asks for your name — that's it.

---

## 🌍 Deploy for the whole team

The fastest path is **Render** with our pre-configured `render.yaml`. See **[RENDER_DEPLOY.md](./RENDER_DEPLOY.md)** for the full step-by-step (~10 minutes).

In short:
1. Push this folder to a GitHub repo
2. Connect Render to that repo via "New → Blueprint"
3. Render reads `render.yaml` and deploys automatically
4. Share the resulting URL with your team

**Important:** the free tier wipes data on restart. For production use, switch to the paid tier with a persistent disk — instructions are in `render.yaml` (commented out, ready to enable) and explained in `RENDER_DEPLOY.md`.

### Other hosting options

| Option | Cost | Notes |
|---|---|---|
| **Render** (with `render.yaml`) | Free / $7+/mo | Easiest. Has our blueprint config. |
| **Railway** | Free trial credit | Auto-detects Node. Set start command: `node server/server.js` |
| **Company VM / EC2** | Whatever Blend pays | SSH in, `git clone`, `npm install`, run with PM2 |
| **Local laptop on Wi-Fi** | Free | For internal testing only |

---

## 📁 File structure

```
blend-simple/
├── index.html              ← Dashboard (3 tracks)
├── foundation.html         ← AI PM Foundation track
├── advanced.html           ← Advanced Delivery track
├── enterprise.html         ← Enterprise Transformation track
├── app.js                  ← Client-side helper (user identity, fetch wrapper)
├── README.md               ← This file
└── server/
    ├── server.js           ← Express server (~250 lines, all endpoints)
    ├── certificates.js     ← PDF certificate generator (PDFKit)
    ├── package.json        ← Dependencies (express, cors, pdfkit only)
    └── data.json           ← Auto-created on first run — your data lives here
```

---

## 💾 Data storage

Everything is stored in a single file: `server/data.json`.

It contains:
- `users` — name + ID of everyone who has visited
- `modules` — the editable module content for all 3 tracks (seeded from the HTML on first run)
- `progress` — each user's lesson completion
- `certificates` — issued certificate IDs and metadata

**Back this file up regularly** if the hub is in production use. Copy it to OneDrive / S3 / wherever — that's your full backup.

To reset everything, stop the server, delete `data.json`, restart. The file rebuilds from the HTML defaults.

---

## 🔌 API endpoints

All endpoints require **two simple headers** — no token, no auth:
- `x-user-id`: a UUID stored in the browser (auto-generated on first visit)
- `x-user-name`: the user's display name

| Method | Endpoint | Purpose |
|---|---|---|
| `GET`    | `/api/modules/:track` | Get all modules for a track |
| `PUT`    | `/api/modules/:track` | Replace all modules for a track |
| `PUT`    | `/api/modules/:track/:id` | Update one module |
| `GET`    | `/api/progress` | Get current user's progress (all tracks) |
| `GET`    | `/api/progress/:track` | Get progress for one track |
| `PUT`    | `/api/progress/:track` | Save progress for one track |
| `GET`    | `/api/dashboard` | KPI summary for the current user |
| `GET`    | `/api/certificates/status/:track` | Is a cert available? |
| `POST`   | `/api/certificates/generate/:track` | Generate a cert (requires 100% complete) |
| `GET`    | `/api/certificates/download/:track` | Download PDF |
| `GET`    | `/api/certificates/all` | List user's certs |
| `GET`    | `/api/health` | Health check |

---

## ❓ Common questions

**Q: How does identity work without login?**
Each browser generates a UUID on first visit and stores it in localStorage with the user's name. The server just trusts what the browser sends. Good enough for a friendly internal tool; not suitable for anything where identity matters legally.

**Q: Can two people edit at once?**
Yes. The server uses a serialised write queue to prevent file corruption. Last write wins.

**Q: What happens if `data.json` gets corrupted?**
Stop the server, restore your backup, restart. If you have no backup, delete the file and the system reseeds from the HTML — but you lose all user progress and edits.

**Q: Can I move from this to a real database later?**
Yes. The data model is simple JSON. Swap the `readData()` / `writeData()` functions in `server.js` for DynamoDB / Postgres / Firestore calls when you outgrow this setup.

---

## 📝 Need help?

The code is < 500 lines total. Open `server/server.js` and read it — it's deliberately small and uncommented sections are uncommented because they don't need explaining.
