// ─────────────────────────────────────────────────────────
// API base — Vercel / production vs LAN / local dev
// ─────────────────────────────────────────────────────────
//
// 1) REACT_APP_API_URL — set on Vercel to your Render API origin (https://…)
// 2) Otherwise — same machine / LAN: browser hostname + API port (default 3001)

const API_PORT = process.env.REACT_APP_API_PORT || 3001;

export const API_BASE =
  process.env.REACT_APP_API_URL ||
  `http://${window.location.hostname}:${API_PORT}`;

export default API_BASE;

export function serverUrl(p) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = API_BASE.replace(/\/$/, '');
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${base}${path}`;
}
