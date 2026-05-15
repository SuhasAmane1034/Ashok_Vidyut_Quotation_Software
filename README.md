# QuoteFlow — LED Quotation Manager

Full-stack quotation app: **React (CRA)** frontend, **Express** API, **libSQL** database (Turso in production or a local file for development), and **Cloudinary** for images.

---

## Architecture

| Piece | Local development | Production |
|--------|---------------------|------------|
| Frontend | `client/` — `npm start` (port 3000) | **Vercel** — static build from `client/` |
| Backend | `server/` — `npm start` (port 3001) | **Render** — `server/` Web Service |
| Database | `server/quotations.db` via `file:` URL (no Turso account) | **Turso** — `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` |
| Images | Cloudinary (same as prod; use a free Cloudinary account) | **Cloudinary** |

---

## Quick start (local)

### 1. Install Node.js

Use current LTS from [https://nodejs.org](https://nodejs.org).

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Environment files

**`server/.env`** — copy from `server/.env.example` and set at minimum:

- `JWT_SECRET` — long random string.
- **Cloudinary** — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (image upload and company logo require these even locally).

Optional for local DB (default): leave `TURSO_DATABASE_URL` empty; the server uses `server/quotations.db` through `@libsql/client` with a `file:` URL.

**`client/.env`** (optional for LAN): leave `REACT_APP_API_URL` empty so the browser uses `http://<hostname>:3001`.

### 4. Run

**Windows:** `START.bat`

**Mac/Linux:** `chmod +x start.sh && ./start.sh`

**Two terminals:**

```bash
# Terminal 1 — API (listens on 0.0.0.0:3001)
cd server && npm start

# Terminal 2 — React (LAN-friendly)
cd client && HOST=0.0.0.0 npm start
```

Open `http://localhost:3000` (or `http://<your-LAN-IP>:3000` from another device). The client calls `http://<same-hostname>:3001` automatically when `REACT_APP_API_URL` is unset.

---

## Environment variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Default `3001`. Render sets `PORT` automatically. |
| `NODE_ENV` | No | Use `production` on Render. |
| `JWT_SECRET` | **Yes (prod)** | Secret for signing JWTs. |
| `TURSO_DATABASE_URL` | No* | Turso libsql URL, e.g. `libsql://....turso.io`. If empty, local `file:…/quotations.db` is used. |
| `TURSO_AUTH_TOKEN` | With Turso | Database token from Turso dashboard. |
| `FRONTEND_URL` | **Yes (strict prod)** | Comma-separated allowed origins, e.g. `https://app.vercel.app`. In `NODE_ENV=production`, if unset, CORS allows all origins but logs a warning. |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | **Yes** | API key. |
| `CLOUDINARY_API_SECRET` | **Yes** | API secret. |
| `SERVE_CLIENT` | No | Set to `true` only if you serve `client/build` from the same Node process (optional combined hosting). |

\*For production on Render, set Turso URL + token.

### Client (`client/.env` — build-time for Vercel)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Full origin of the API, no trailing slash, e.g. `https://quoteflow-api.onrender.com`. **Set this on Vercel.** |
| `REACT_APP_API_PORT` | Used only when `REACT_APP_API_URL` is empty; default `3001`. |

---

## Turso (database)

1. Install the CLI: [https://docs.turso.tech/cli/introduction](https://docs.turso.tech/cli/introduction)
2. Sign up / log in: `turso auth login`
3. Create a database: `turso db create quoteflow`
4. Get the URL: `turso db show quoteflow --url`
5. Create a token: `turso db tokens create quoteflow`
6. Put `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in **Render** (and in local `server/.env` if you want to point local dev at Turso).

The app runs `CREATE TABLE IF NOT EXISTS` and seeds default settings/products on startup, so a new Turso database comes up empty then seeds like a fresh install.

### Migrating an old SQLite file into Turso

If you still have a legacy `quotations.db` from `better-sqlite3`:

1. Dump SQL: `sqlite3 quotations.db .dump > dump.sql` (or use a GUI).
2. Pipe into Turso: `turso db shell quoteflow < dump.sql` (review/edit dump for compatibility if needed).

---

## Cloudinary (images)

1. Create a free account at [https://cloudinary.com](https://cloudinary.com)
2. Dashboard → copy **Cloud name**, **API Key**, **API Secret**
3. Add them to `server/.env` (local) and to **Render** environment variables (production)

Uploads go to folder `quoteflow/` in Cloudinary. The API stores **HTTPS URLs** in the database (`products.image`, `quotations.company_logo`, item images, etc.). Old relative paths like `/uploads/...` still resolve if present in legacy data.

---

## Deploy backend — Render

1. Push the repo to GitHub.
2. In Render: **New** → **Web Service** → connect the repo.
3. Set **Root Directory** to `server`.
4. **Build command:** `npm install`  
   **Start command:** `npm start`
5. Add environment variables: `NODE_ENV=production`, `JWT_SECRET`, `TURSO_*`, `CLOUDINARY_*`, `FRONTEND_URL` (your Vercel URL, comma-separated if you have previews).
6. Optional: use the included `render.yaml` blueprint for the same layout.
7. After deploy, open `https://<your-service>.onrender.com/api/health` — you should see `{ "status": "ok", ... }`.

---

## Deploy frontend — Vercel

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `client`.
3. **Framework preset:** Create React App.
4. **Environment variables:** `REACT_APP_API_URL` = your Render API URL (e.g. `https://quoteflow-api.onrender.com`).
5. Deploy. `client/vercel.json` adds SPA rewrites so client-side routes work.

---

## GitHub → Vercel + Render (summary)

1. Push code to a GitHub repository.
2. **Render:** new Web Service, root `server`, env vars as above, deploy.
3. **Vercel:** new project, root `client`, set `REACT_APP_API_URL` to the Render URL, deploy.
4. Update **`FRONTEND_URL`** on Render to match your Vercel production URL (and any preview URLs you use).

---

## npm install commands (reference)

```bash
cd server && npm install
cd ../client && npm install
```

Server runtime dependencies include: `@libsql/client`, `cloudinary`, `multer-storage-cloudinary`, `dotenv`, `helmet`, `compression`, `express`, `cors`, `multer`, `jsonwebtoken`, `bcryptjs`, `uuid`, `xlsx`.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| CORS errors from the browser | `FRONTEND_URL` on Render must include the exact Vercel origin (`https://…`). |
| `401` on API | JWT secret changed between deploys, or missing `Authorization` header — log in again. |
| Image upload fails | Cloudinary env vars on the **server**; keys must match the Cloudinary dashboard. |
| DB connection errors | Turso URL/token; or local `server/quotations.db` permissions if using file DB. |
| Vercel app calls wrong API | Rebuild after changing `REACT_APP_API_URL`; value must be the API origin only (no `/api` suffix). |

---

## Optional: serve the SPA from Express

Set `SERVE_CLIENT=true` and place a built `client/build` next to the server (or build in CI), with `NODE_ENV=production`. Most teams host the SPA on Vercel instead.

---

## Backup

- **File DB:** copy `server/quotations.db`.
- **Turso:** use Turso backups / export from the dashboard or CLI.

---

## Project layout

```
├── client/                 # React app (Vercel)
│   ├── src/api/config.js   # REACT_APP_API_URL + LAN fallback
│   ├── vercel.json         # SPA rewrites
│   └── .env.example
├── server/
│   ├── index.js            # Express API
│   ├── config/db.js        # @libsql/client
│   ├── config/cloudinary.js
│   ├── db/init.js          # schema + seed
│   ├── quotations.db       # local file DB (optional; gitignored if you add it)
│   └── .env.example
└── render.yaml               # optional Render blueprint
```

---

## License

Use and modify for your business as needed.
