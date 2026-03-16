# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite)
npm run build     # production build
npm run lint      # ESLint
npm run preview   # preview production build locally
```

No test suite exists yet.

## Environment Variables

Three env vars are required (`.env` file, not committed):

- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps / Places API key
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `VITE_ADMIN_KEY` — secret string; admin panel is accessed via `?admin=<key>` in the URL

## Architecture

**Stack:** React 19 + Vite, Supabase (Postgres), Google Maps via `@vis.gl/react-google-maps`.

**App flow:** `App.jsx` is the single root component managing all state. It controls a `view` variable (`'map' | 'submit' | 'admin'`) to swap between the three top-level screens — there is no router.

**Database (Supabase):**
- `bars` table — the live dataset rendered on the map. Key fields: `name`, `address`, `lat`, `lng`, `citywide_price`, `citywide_description`, `citywide_rating`, `google_place_id`, `last_verified_at`.
- `submissions` table — user-submitted new bars or update requests, with `status` (`pending | approved | rejected`) and `type` (`new | update`).

**No user auth.** All writes from the public are append-only inserts into `submissions`. The admin panel (gated by `?admin=<VITE_ADMIN_KEY>`) is the only place that writes to `bars`.

**Admin workflow:** When a submission is approved in `AdminPanel`, the admin manually fills in address, lat/lng, and Google Place ID before inserting/updating the bar. This is intentional — the admin controls data quality.

**Google ratings:** `useGoogleRating.js` fetches live Google ratings in `BarDrawer`. It first tries `bar.google_place_id` directly; if that fails or is missing, it falls back to a text search by name + address. Google Place IDs should be set in the admin panel at approval time to avoid unnecessary text search API calls.

**Verification:** Any visitor can click "Still accurate" on a bar drawer, which updates `last_verified_at` on the `bars` row directly (no auth, no submissions table). Bars are considered stale after 90 days.

**CSS:** Single `index.css` file using BEM-style class naming (e.g., `.drawer__price-row`, `.admin__card--approved`). No CSS framework.
