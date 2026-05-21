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
- Updated Buy/Sell segmented controls so active options keep the dark terminal surface while the label, border, and inset treatment glow white.
- Added a Tradable Stocks panel to the Buy/Sell tab so users can see which tickers they are currently allowed to buy and click one to populate the order instrument.
- Replaced the raw `league_member_id` label in the Portfolio tab with a cleaner league name and user display name label.
- Added a shared authenticated app header with a moving API-backed market ticker to dashboard, league, and profile setup pages.
- Moved the API-backed market ticker out of the header into a fixed authenticated footer, with a randomized page-load ticker subset and duplicated ticker groups for a cleaner loop.
- Added a shared authenticated app shell with a passive animated candlestick background behind post-landing pages.
- Changed dashboard league browsing from a single button-cycled league card to a vertically scrollable list of all user leagues.
- Replaced the static dashboard market-open badge with an Eastern Time market-hours indicator.

### Backend

- Added `backend/config.py` to centralize backend environment loading.
- Backend modules now load root `.env` first for shared Supabase values, then `backend/.env.back` with override enabled for backend-specific Alpaca settings.
- Added `backend/.env.back` to `.gitignore` so the new Alpaca key file is kept out of version control.
