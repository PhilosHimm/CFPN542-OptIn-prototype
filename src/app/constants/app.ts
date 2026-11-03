// ── App identity ─────────────────────────────────────────────────────────────
// Single source of truth for the app's display name. Does not cover
// index.html, public/manifest.json, public/robots.txt, or public/sitemap.xml —
// those are static files with no build-time templating (no vite-plugin-html or
// equivalent configured), so they still hardcode "OptIn" and the production URL (https://optinapp.vercel.app) directly.
// See docs/BACKLOG.md item #54.
export const APP_NAME = "OptIn";
