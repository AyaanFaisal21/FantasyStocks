# Changelog

## Unreleased

### Performance

- Optimized the landing hero stock-wave canvas in `src/Components/StockWave.jsx` for better initial-load behavior.
- Added an immediate static first paint so the hero background renders before continuous animation starts.
- Deferred canvas animation startup until browser idle time, with a 900 ms timeout fallback.
- Capped stock-wave animation to 20 FPS instead of repainting on every `requestAnimationFrame` tick.
- Capped internal canvas pixel density to 1.1 device pixel ratio, with a 0.85 scale on sub-768 px mobile widths.
- Added a 120 ms resize debounce to avoid repeated full-canvas reseeding during viewport changes.
- Added `IntersectionObserver` visibility gating so animated frames are skipped while the canvas is offscreen.
- Added `prefers-reduced-motion: reduce` support that keeps the dithered stock graph static.
- Replaced per-session `Math.random()` price generation with a seeded pseudo-random walk so the graph remains crisp and randomized-looking while producing deterministic first paint.

### Frontend

- Added a fourth "How it works" card explaining league-winning rules: weekly matchup wins award 1 point, and the best start-to-finish portfolio earns an end-of-season bonus worth total individual matchup count divided by 3.
- Replaced the default Vite browser identity with Fantasy Stocks metadata, a custom SVG favicon, theme color, Open Graph/Twitter summary tags, and a web app manifest.
- Added a visible deployment configuration fallback when required frontend Supabase environment variables are missing, preventing blank-page startup failures.
- Added Vercel SPA rewrites so browser-routed paths resolve to `index.html` in production.

### Backend

- Added `backend/config.py` to centralize backend environment loading.
- Backend modules now load root `.env` first for shared Supabase values, then `backend/.env.back` with override enabled for backend-specific Alpaca settings.
- Added `backend/.env.back` to `.gitignore` so the new Alpaca key file is kept out of version control.
