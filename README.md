# ⚡ QuoteFlow — LED Quotation Manager v3.0

Runs on your laptop, accessible from **any device on the same WiFi network**.

---

## 🚀 Quick Start

### Step 1 — Install Node.js
Download from https://nodejs.org (choose LTS)

### Step 2 — Install dependencies
```bash
cd server  && npm install
cd ../client && npm install
```

### Step 3 — Start

**Windows:** Double-click `START.bat`

**Mac/Linux:**
```bash
chmod +x start.sh && ./start.sh
```

**Manual (two terminals):**
```bash
# Terminal 1
cd server && node index.js

# Terminal 2 — HOST=0.0.0.0 makes React accept LAN connections
cd client && HOST=0.0.0.0 npm start          # Mac/Linux
set HOST=0.0.0.0 && npm start                # Windows CMD
$env:HOST="0.0.0.0"; npm start              # PowerShell
```

---

## 📡 Access from Other Devices

### Find your laptop's IP
```bash
Mac:     ipconfig getifaddr en0
Linux:   hostname -I | awk '{print $1}'
Windows: ipconfig | findstr "IPv4"
# Result: something like 192.168.1.42
```

### Open on phone / tablet / other laptop
```
http://192.168.1.42:3000
```
The app **auto-connects** to `http://192.168.1.42:3001` — no config needed.

---

## 🔐 First-Time Setup
1. Go to `http://<your-ip>:3000/register`
2. Create your account
3. Start creating quotations!

---

## ⚙️ Environment Variables

**`server/.env`** (copy from `server/.env.example`)
| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `3001` | Express port |
| `JWT_SECRET` | `quoteflow_secret_...` | Change for production! |

**`client/.env`** (copy from `client/.env.example`)
| Variable | Default | Notes |
|----------|---------|-------|
| `REACT_APP_API_URL` | *(empty)* | Leave empty for LAN auto-detect. Set for production. |
| `REACT_APP_API_PORT` | `3001` | Only if you change the backend port |

---

## 🌐 How LAN Auto-Detection Works

```
client/src/api/config.js
─────────────────────────
const API_BASE =
  process.env.REACT_APP_API_URL           // production override
  || `http://${window.location.hostname}:3001`  // auto-detect at runtime

Phone  opens http://192.168.1.42:3000  →  API = http://192.168.1.42:3001 ✅
Laptop opens http://localhost:3000     →  API = http://localhost:3001     ✅
```

No IP is hardcoded anywhere in the codebase.

---

## 🔧 Common Issues

| Problem | Fix |
|---------|-----|
| "Connection refused" from phone | Allow ports 3000 + 3001 in Firewall (see below) |
| API works on laptop, fails on phone | Ensure `HOST=0.0.0.0` is set for React |
| "Network Error" in console | Phone is on mobile data, not WiFi — or VPN is active |
| Port already in use | `lsof -ti:3001 \| xargs kill` (Mac/Linux) |

**Allow ports through Firewall:**
```bash
# Linux
sudo ufw allow 3000 && sudo ufw allow 3001

# Mac — System Settings → Network → Firewall → Options → Allow Node
# Windows — Defender Firewall → Inbound Rules → New Rule → TCP 3000, 3001
```

---

## 📁 Project Structure

```
quotation-app/
├── server/
│   ├── index.js          ← Express, listens on 0.0.0.0:3001
│   ├── quotations.db     ← SQLite (single source of truth)
│   ├── uploads/          ← Images
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── config.js ← Dynamic API_BASE ⭐
│   │   ├── context/AppContext.js
│   │   ├── pages/
│   │   └── components/
│   └── .env.example      ← No "proxy" field in package.json!
├── START.bat             ← Windows
└── start.sh              ← Mac/Linux
```

---

## 🌍 Extend to the Internet

**ngrok (instant):**
```bash
ngrok http 3001
# Set REACT_APP_API_URL=https://xxxx.ngrok.io in client/.env → rebuild
```

**Permanent deployment:**
- Frontend → Vercel / Netlify
- Backend  → Railway / Render / Fly.io
- Database → Turso (SQLite) / Supabase (Postgres)

---

## 💾 Backup

All data is in one file: `server/quotations.db`
```bash
cp server/quotations.db backup-$(date +%Y%m%d).db
```
