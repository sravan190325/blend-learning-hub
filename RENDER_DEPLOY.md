# Deploying to Render

This guide walks you from "I have a zip on my laptop" to "I have a public URL my team can use".

**Total time:** ~10 minutes for free tier, ~15 minutes if you set up the paid tier with persistent storage.

---

## What you'll need

1. A free GitHub account ([sign up here](https://github.com/signup))
2. A free Render account ([sign up here](https://render.com/) — log in with GitHub for the smoothest flow)
3. Git installed on your computer ([download](https://git-scm.com/downloads))

---

## Step 1 — Put the code on GitHub

Render deploys from a Git repository. So first, push the unzipped folder to GitHub.

### 1a. Create the repo on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `blend-learning-hub` (or anything you like)
3. Choose **Private** if this contains internal Blend content
4. Don't tick "Add a README" or any other initialiser — leave it empty
5. Click **Create repository**

GitHub now shows you a page with setup commands. Keep this open.

### 1b. Push your local folder

Open a terminal in the unzipped `blend-simple` folder:

```bash
cd blend-simple
git init
git add .
git commit -m "Initial Blend Learning Hub"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/blend-learning-hub.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username. After the last command, GitHub may ask you to log in or paste a personal access token — follow the prompts.

Refresh the GitHub page — you should now see all your files there, including `render.yaml`.

---

## Step 2 — Connect Render to GitHub

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** in the top right → **Blueprint**
3. Click **Connect GitHub** if you haven't already, then authorise Render to read your repos
4. Find your `blend-learning-hub` repo in the list and click **Connect**

Render now scans the repo for `render.yaml`. It will find ours and show a preview:

> **Service:** blend-learning-hub
> **Type:** Web Service (Node)
> **Plan:** Free
> **Build:** `npm install`
> **Start:** `node server.js`

Click **Apply** (or **Deploy**). Render starts building.

---

## Step 3 — Wait for the first deploy

The first build takes 3–5 minutes. You'll see live logs scrolling by — `npm install`, then your server starting up. When you see:

```
Blend Learning Hub running
Open: http://localhost:10000
No login required — anyone can view & edit
```

…your service is live. Render assigns a public URL like:

```
https://blend-learning-hub.onrender.com
```

(Your subdomain will be slightly different — Render adds a random suffix to avoid clashes.)

Click the URL at the top of the Render page to open the hub. The first visit asks for your name — enter it and you're in.

---

## Step 4 — Share with your team

Copy the URL. That's the link your reportees use. Each person gets a unique browser identity on their first visit, so progress and certificates are per-person. **Module edits, however, are shared** — when anyone edits content, everyone sees it.

---

## ⚠️ Free tier caveats (read this)

Render's free tier has two behaviours you need to know about:

### Behaviour 1: Service sleeps after 15 minutes of inactivity
If nobody opens the hub for 15 minutes, Render puts the service to sleep. The next visitor will wait 30–60 seconds for it to wake up. Once awake, it stays awake until idle again.

**Workaround:** Use [UptimeRobot](https://uptimerobot.com) (free) to ping `https://your-app.onrender.com/api/health` every 5 minutes — keeps the service awake 24/7.

### Behaviour 2: The filesystem resets on every restart
This is the important one. **Every time the service restarts, `data.json` is wiped.** Restarts happen when:
- The service wakes from sleep (sometimes — depends on Render's infra)
- You push new code to GitHub
- Render does routine maintenance

This means user progress and module edits **can disappear**.

**This is fine for testing.** It's not fine for a production team tool.

---

## Upgrading to persistent storage (Option B)

When you're ready to use the hub for real, switch to Render's paid Starter tier with a persistent disk. Cost: about **$7.25/month** (Starter service + 1 GB disk).

### Steps

1. Open `render.yaml` in your repo
2. Find these lines and follow the instructions in the file:
   - Change `plan: free` → `plan: starter`
   - Uncomment the `DATA_DIR` and `CERTIFICATES_DIR` env vars
   - Uncomment the `disk:` block at the bottom
3. Commit and push:
   ```bash
   git add render.yaml
   git commit -m "Enable persistent storage"
   git push
   ```
4. Render auto-detects the change and redeploys with the disk attached

After this:
- `data.json` lives at `/var/data/data.json` on a real persistent disk
- Certificate PDFs live at `/var/data/certificates/`
- Nothing is wiped on restart
- The service never sleeps
- 1 GB is plenty for hundreds of users — you can resize later if needed

---

## Common issues

**"Build failed: Cannot find module 'pdfkit'"**
Make sure you pushed `server/package.json` to GitHub. Check the repo on github.com — it should be there.

**"Service is up but the page shows 'Cannot GET /'"**
Render's root directory needs to be `server` (set in `render.yaml`). The HTML files are served from the parent folder. If you renamed the root folder structure, the `HTML_DIR  = path.join(__dirname, '..')` in `server.js` won't find the HTML. Keep the folder structure as it ships.

**"My data disappeared!"**
You're on the free tier without a persistent disk. See Option B above.

**"Render won't deploy — it says no render.yaml found"**
Make sure `render.yaml` is in the **root of your repo**, not inside `blend-simple/` or `server/`. If you cloned the zip wrong, check `git ls-files` and `render.yaml` should appear at the top level.

---

## Updating the hub after deployment

Once you've deployed, any change you make and push to GitHub auto-deploys to Render:

```bash
# edit a file...
git add .
git commit -m "Updated foundation module 3"
git push
```

Render picks up the push and redeploys within 1–2 minutes.

---

## Stopping or deleting

- **Pause the service**: Render dashboard → your service → Settings → Suspend Service
- **Delete it completely**: Render dashboard → your service → Settings → Delete Service (scroll to bottom)
- **Take down the GitHub repo**: github.com → your repo → Settings → scroll to bottom → Delete this repository
