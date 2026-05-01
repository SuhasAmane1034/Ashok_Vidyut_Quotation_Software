// ─────────────────────────────────────────────────────────
// API Base URL — Dynamic, works from any device on the LAN
// ─────────────────────────────────────────────────────────
//
// Priority:
//  1. REACT_APP_API_URL env var  (production override)
//  2. window.location.hostname   (auto LAN detection at runtime)
//
// Examples:
//  Phone opens  http://192.168.1.42:3000  → API = http://192.168.1.42:3001
//  Laptop opens http://localhost:3000     → API = http://localhost:3001
//  Production   REACT_APP_API_URL=https://api.myapp.com

const API_PORT = process.env.REACT_APP_API_PORT || 3001;

export const API_BASE =
  process.env.REACT_APP_API_URL ||
  `http://${window.location.hostname}:${API_PORT}`;

export default API_BASE;

// ─────────────────────────────────────────────────────────
// Helper: build a full server URL for images/uploads
// Use this instead of hardcoding http://localhost:3001
// ─────────────────────────────────────────────────────────
export function serverUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path; // already absolute
  return `${API_BASE}${path}`;             // e.g. http://192.168.1.42:3001/uploads/xyz.jpg
}
