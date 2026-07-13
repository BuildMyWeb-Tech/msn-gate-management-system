# MSN Gate Management — Complete Deployment Guide

---

## OVERVIEW

| Layer    | Platform | URL Format                              |
|----------|----------|-----------------------------------------|
| Frontend | Vercel   | `https://msn-gms.vercel.app`           |
| Backend  | Render   | `https://gms-backend.onrender.com`     |
| Database | External MS SQL Server (already live)  |

---

## STEP 1 — PREPARE YOUR REPO ON GITHUB

### 1.1 Create two GitHub repositories

Go to https://github.com/new and create:
- `msn-gms-frontend`
- `msn-gms-backend`

### 1.2 Push backend to GitHub

Open terminal in your `backend/` folder:

```bash
cd backend

git init
git add .
git commit -m "Initial backend commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/msn-gms-backend.git
git push -u origin main
```

### 1.3 Push frontend to GitHub

Open terminal in your `frontend/` folder:

```bash
cd frontend

git init
git add .
git commit -m "Initial frontend commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/msn-gms-frontend.git
git push -u origin main
```

> NOTE: `.env` files are in `.gitignore` — they will NOT be pushed. Good.

---

## STEP 2 — DEPLOY BACKEND ON RENDER

### 2.1 Create account
Go to https://render.com → Sign up (free with GitHub)

### 2.2 Create new Web Service
- Click **New** → **Web Service**
- Connect your GitHub account
- Select repo: `msn-gms-backend`
- Click **Connect**

### 2.3 Configure the service

| Field           | Value                  |
|-----------------|------------------------|
| Name            | `gms-backend`          |
| Region          | Singapore (closest)    |
| Branch          | `main`                 |
| Runtime         | `Node`                 |
| Build Command   | `npm install`          |
| Start Command   | `npm start`            |
| Instance Type   | Free                   |

### 2.4 Set Environment Variables

Click **Environment** tab → Add these one by one:

| Key                    | Value                          |
|------------------------|--------------------------------|
| `NODE_ENV`             | `production`                   |
| `PORT`                 | `5000`                         |
| `DB_SERVER`            | `108.181.197.190`              |
| `DB_PORT`              | `19649`                        |
| `DB_USER`              | `msnadmin`                     |
| `DB_PASSWORD`          | `CounterPay01`                 |
| `DB_NAME`              | `Gate_Mgmt`                    |
| `DB_ENCRYPT`           | `false`                        |
| `DB_TRUST_CERT`        | `true`                         |
| `DB_CONNECTION_TIMEOUT`| `30000`                        |
| `DB_REQUEST_TIMEOUT`   | `30000`                        |
| `DEFAULT_COMPANY_CODE` | `1`                            |
| `PASS_PREFIX`          | `PASS`                         |
| `FRONTEND_URL`         | `https://msn-gms.vercel.app`  |

### 2.5 Deploy
- Click **Create Web Service**
- Wait ~3 minutes for first deploy
- Check logs for: `✅ MS SQL Server connected → Gate_Mgmt DB`
- Test: `https://gms-backend.onrender.com/health` → should return `{ success: true }`

> IMPORTANT: Copy your Render URL. Format: `https://gms-backend-XXXX.onrender.com`

---

## STEP 3 — DEPLOY FRONTEND ON VERCEL

### 3.1 Create account
Go to https://vercel.com → Sign up with GitHub

### 3.2 Import project
- Click **Add New** → **Project**
- Import from GitHub: `msn-gms-frontend`
- Click **Import**

### 3.3 Configure build settings

| Field            | Value         |
|------------------|---------------|
| Framework Preset | Vite          |
| Root Directory   | `./`          |
| Build Command    | `npm run build` |
| Output Directory | `dist`        |
| Install Command  | `npm install` |

### 3.4 Set Environment Variables

Click **Environment Variables** → Add:

| Key            | Value                                          |
|----------------|------------------------------------------------|
| `VITE_API_URL` | `https://gms-backend-XXXX.onrender.com/api`   |

> Replace `gms-backend-XXXX` with your actual Render URL from Step 2.5

### 3.5 Deploy
- Click **Deploy**
- Wait ~2 minutes
- Your URL will be: `https://msn-gms.vercel.app` (or similar)

### 3.6 Update CORS on backend
Go to Render → your backend service → Environment:
- Update `FRONTEND_URL` to your actual Vercel URL
- Click **Save** → Render auto-redeploys

### 3.7 Test full flow
1. Open `https://msn-gms.vercel.app`
2. Login: `Admin / Admin`, Gate: Gate 1
3. Dashboard should load ✓

---

## STEP 4 — PWA INSTALL (ANDROID + WINDOWS)

### Android (Chrome)
1. Open your Vercel URL in Chrome on Android
2. After ~2 seconds, an **"Install App"** banner appears at the bottom
3. Tap **Install App**
4. App icon appears on home screen
5. Opens in fullscreen — no browser address bar

### Windows (Chrome or Edge)
1. Open your Vercel URL in Chrome/Edge on Windows
2. Look for **install icon** in the address bar (right side)
   - Chrome: computer icon with ↓ arrow
   - Edge: `+` icon in address bar
3. Click it → **Install**
4. App opens as a standalone desktop window
5. Also appears in Start Menu as "MSN Gate Management"

### Windows (Edge — PWA to .exe-like app)
1. Open URL in Edge
2. Click `...` menu → **Apps** → **Install this site as an app**
3. Click **Install**
4. App appears in taskbar and Start Menu

---

## STEP 5 — iPhone (iOS Safari)

> iOS does NOT support automatic install prompts.
> The app shows step-by-step instructions automatically.

1. Open Vercel URL in **Safari** (must be Safari, not Chrome)
2. After 2 seconds, an instruction banner appears:
   - Step 1: Tap the Share button (box with arrow pointing up)
   - Step 2: Scroll down → "Add to Home Screen"
   - Step 3: Tap "Add"
3. App icon appears on iPhone home screen
4. Opens fullscreen like a native app

---

## STEP 6 — ANDROID APK (TWA — Trusted Web Activity)

> This converts your PWA into an actual APK for Google Play or sideloading.
> No code needed — uses Google's Bubblewrap tool.

### Option A: Use PWABuilder (Easiest — No coding)

1. Go to https://www.pwabuilder.com
2. Enter your Vercel URL: `https://msn-gms.vercel.app`
3. Click **Start**
4. It validates your PWA manifest ✓
5. Click **Package For Stores**
6. Select **Android**
7. Click **Generate Package**
8. Download the `.apk` file
9. Transfer to Android phone
10. Enable "Install from unknown sources" in Android settings
11. Install the APK

### Option B: Manual with Bubblewrap (Advanced)

```bash
# Install bubblewrap
npm install -g @bubblewrap/cli

# Initialize
bubblewrap init --manifest https://msn-gms.vercel.app/manifest.webmanifest

# Build APK
bubblewrap build

# Output: app-release-signed.apk
```

### APK Requirements (all already set):
- ✅ HTTPS (Vercel provides this)
- ✅ Web App Manifest (vite.config.js sets it up)
- ✅ Service Worker registered
- ✅ Icons: 192x192 and 512x512 maskable
- ✅ display: standalone

---

## STEP 7 — AFTER DEPLOYMENT CHECKLIST

| Check | How |
|-------|-----|
| Health check | `GET /health` returns 200 |
| DB connected | Render logs show `✅ MS SQL Server connected` |
| Login works | Admin/Admin logs in successfully |
| PWA banner | Shows on Android/Chrome |
| iOS install | Instructions show in Safari |
| Icons load | `/icons/icon-192.png` is accessible |
| HTTPS only | Both Vercel and Render use HTTPS |

---

## UPDATING THE APP

### Update backend code:
```bash
cd backend
git add .
git commit -m "Your changes"
git push origin main
# Render auto-deploys in ~2 minutes
```

### Update frontend code:
```bash
cd frontend
git add .
git commit -m "Your changes"
git push origin main
# Vercel auto-deploys in ~1 minute
```

### Users get the update automatically:
- PWA auto-updates via service worker on next launch
- No need to reinstall the app

---

## ENVIRONMENT VARIABLES SUMMARY

### Backend (Render)
```
NODE_ENV=production
PORT=5000
DB_SERVER=108.181.197.190
DB_PORT=19649
DB_USER=msnadmin
DB_PASSWORD=CounterPay01
DB_NAME=Gate_Mgmt
DB_ENCRYPT=false
DB_TRUST_CERT=true
DB_CONNECTION_TIMEOUT=30000
DB_REQUEST_TIMEOUT=30000
DEFAULT_COMPANY_CODE=1
PASS_PREFIX=PASS
FRONTEND_URL=https://msn-gms.vercel.app
```

### Frontend (Vercel)
```
VITE_API_URL=https://gms-backend-XXXX.onrender.com/api
```

---

## TROUBLESHOOTING

### PWA install button not showing?
- Must be served over HTTPS ✓ (Vercel handles this)
- Must have valid manifest ✓
- Must have service worker ✓
- Chrome requires user to visit site at least once before showing prompt

### Backend on Render goes to sleep (free tier)?
- Free Render services sleep after 15 min of inactivity
- First request after sleep takes ~30 seconds (cold start)
- Solution: Upgrade to Render Starter plan ($7/month) for always-on
- Or use UptimeRobot to ping `/health` every 10 min (free)

### CORS errors after deploy?
- Update `FRONTEND_URL` env var on Render with exact Vercel URL
- Make sure no trailing slash in the URL

### iOS PWA not showing instructions?
- Must open in Safari (not Chrome iOS)
- Instructions appear after 2 seconds on first visit
- Dismissed for 7 days after clicking "Not now"
