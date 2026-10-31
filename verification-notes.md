# SmartQ-Bill Verification Notes

## Latest Session — Dark Theme Redesign + Landing Page Integration

### Changes Made
- **`frontend/index.html`**: Updated branding to "SmartQ-Bill — Intelligence in Every Transaction", added Google Fonts preconnect for `Barlow Condensed` + `DM Sans`, theme color updated to `#080b08`.
- **`frontend/src/index.css`**: Full design system rewrite — dark forest-green theme (`#080b08` bg, `#101610` panels, `#ff7900` orange accent). Custom CSS classes: `.eyebrow`, `.pill`, `.notice`, `.confirm`, `.btn`, `.btn-orange`, `.btn-outline`, `.btn-dark`, `.mic-wrap`, `.mic`, `.wave`, `.quantum-orb`, `.floating-card`, `.metric`, `.grid-bg`. Font families: `Barlow Condensed` (display) + `DM Sans` (body).
- **`frontend/src/components/VoiceBilling.tsx`**: Complete redesign — dark green VOICE TO INVOICE terminal UI with 2-column grid layout (Voice Command Center + Live Checkout Cart), 32-bar audio equalizer visualizer, language selector (EN-IN/HI-IN/EN-US), quick-add product catalog (8 items from store or defaults), cashier approval gate, payment mode + UPI modals, WhatsApp sharing, PDF invoice download.
- **`frontend/src/components/LandingView.tsx`**: New SmartQ-Bill landing page — hero section with quantum orb, floating cards, feature grid (6 features), workflow steps (4 steps), metrics, CTA section, footer. Full dark theme matching the new design system.
- **`frontend/src/App.tsx`**: Wired LandingView into Router — unauthenticated users on `/` now see the SmartQ-Bill landing page with "Launch Voice Billing" → `/login` and "Shopkeeper Login" → `/login` CTAs.
- **`backend/core/settings.py`**: Production-hardened — `SECRET_KEY` from env, `DEBUG` from env (defaults True), `ALLOWED_HOSTS` from env, WhiteNoise middleware for static files, PostgreSQL via `DATABASE_URL` env var (Render), MySQL fallback, SQLite local dev.
- **`backend/requirements.txt`**: Added `dj-database-url>=2.1.0` and `psycopg2-binary>=2.9.9` for PostgreSQL/Render deployment.
- **`backend/build.sh`**: New Render.com build script — pip install, migrate, collectstatic, and superuser setup.

### Verification
- TypeScript check: ✅ Zero errors (`npx tsc --noEmit`)
- LandingView routing: ✅ Unauthenticated `/` → LandingView → `/login`
- Authenticated `/` → Home dashboard
- Design system: Dark green + orange accent, Barlow Condensed display font, DM Sans body

### Known Build Advisory
- Vite may report a >500 kB chunk warning due to chart library (non-blocking).
