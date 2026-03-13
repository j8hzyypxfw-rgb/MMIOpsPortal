# Marketplace Ministries — ECR Portal
### Vercel Deployment Guide

---

## Option A — Deploy via GitHub (Recommended, 10 min)

### Step 1: Create a GitHub Repo
1. Go to **github.com** → click **New repository**
2. Name it `mm-ecr-portal`
3. Set to **Private**
4. Click **Create repository**

### Step 2: Upload the project files
Drag and drop the entire `mm-vercel` folder contents into the repo, or use the GitHub CLI:

```bash
cd mm-vercel
git init
git add .
git commit -m "Initial MM ECR Portal"
git remote add origin https://github.com/YOUR_ORG/mm-ecr-portal.git
git push -u origin main
```

### Step 3: Connect to Vercel
1. Go to **vercel.com** → Sign in (use your GitHub account)
2. Click **Add New → Project**
3. Select your `mm-ecr-portal` repo
4. Vercel auto-detects Vite — leave all settings as default
5. Click **Deploy**

✅ Your portal will be live at `https://mm-ecr-portal.vercel.app` in ~60 seconds.

---

## Option B — Deploy via Vercel CLI (5 min)

```bash
# Install Vercel CLI
npm install -g vercel

# From the mm-vercel folder
cd mm-vercel
npm install
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: mm-ecr-portal
# - Directory: ./
# - Override settings? No
```

---

## Sharing with the Team

After deploy, go to your Vercel dashboard and:

1. **Custom domain** (optional): Settings → Domains → Add `portal.marketplaceministries.org`
2. **Password protection**: Settings → Security → Enable Password Protection (Vercel Pro)
3. **Share the URL** directly — the app has its own login screen with role-based access

---

## Updating the Portal

Any push to the `main` branch on GitHub auto-deploys to Vercel.

To update locally:
```bash
# Edit src/App.jsx
git add .
git commit -m "Update: [description]"
git push
# Vercel auto-deploys in ~45 seconds
```

---

## Project Structure

```
mm-vercel/
├── index.html          # Entry HTML
├── package.json        # Dependencies
├── vite.config.js      # Build config
├── vercel.json         # Vercel routing
├── public/
│   └── favicon.svg     # MM favicon
└── src/
    ├── main.jsx        # React root
    └── App.jsx         # Full portal (3800+ lines)
```

---

## Tech Stack
- **React 18** — UI framework
- **Vite 5** — Build tool (fast HMR in dev)
- **Recharts** — All charts and data visualizations
- **Vercel** — Hosting + CDN

No backend required — all data is currently mock/demo. When ready to connect live data, the API layer slots in via environment variables.
