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
  (window.location.hostname === "localhost"
    ? `http://localhost:${API_PORT}`
    : "https://ashok-vidyut-quotation-software.onrender.com");

export default API_BASE;
