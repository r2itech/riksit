# RIKSIT — AI-Powered Environmental Intelligence

RIKSIT turns Indonesia's public environmental data — weather, air quality,
earthquakes, and early warnings — into actionable insight, summarized by AI
into a **Current Conditions** brief, **Potential Risks**, and **Recommendations**
in Bahasa Indonesia.

> Observe. Understand. Act.

The layout is inspired by [nemesis.assai.id](https://nemesis.assai.id): the map
is the full-screen canvas, with the AI Insight panel, data cards, and region
selectors floating on top as overlays.

---

## Tech Stack

| Category      | Choice                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| Framework     | **Next.js 14** (App Router) + **TypeScript**                                     |
| Styling       | **Tailwind CSS** (custom dark + neon theme, glassmorphism)                       |
| Map           | **Leaflet** + **react-leaflet** with **CARTO Dark** tiles                        |
| AI            | **Google Gemini API** via `generativelanguage.googleapis.com` (server-side only) |
| Markdown      | Tiny in-house renderer (`src/lib/markdown.ts`) — no extra deps                   |
| UI components | Custom (`SearchableSelect`, `CardShell`, etc.) — no external UI library          |

No heavy UI dependencies: no react-select, headlessui, framer-motion, etc.

---

## Features

### Region selection

- **Cascading dropdowns** Province → Regency/City → District → Village.
- **Searchable**: type to filter at every level (arrow keys + Enter, click-outside closes, Esc cancels).
- **Auto-detect location** via `navigator.geolocation` + Nominatim reverse-geocode. Falls back to Kab. Majalengka, Jawa Barat if geolocation is denied.
- **Click on the map** → resolves the click to the nearest village by walking Nominatim + `wilayah.id`. The dropdowns mirror the click automatically.
- **URL persistence**: the active region is stored in query params (`?p=…&r=…&d=…&v=…`) — sharable and bookmarkable.

### Data dashboard

- **Current weather** (BMKG): temperature, condition icon, humidity, wind, cloud cover.
- **3-day forecast**: daily summary with icon + min/max temperature.
- **Air quality** (Open-Meteo): PM2.5 plus a color-coded band (Good / Moderate / Unhealthy / etc.) + PM10, NO₂, O₃.
- **Latest earthquake** (BMKG `autogempa.json`): magnitude, region, depth, coordinates, advisory.
- **Early warnings**: banner shown when severe weather codes are detected for the day.

### Interactive map

- **CARTO Dark** tiles served via OpenStreetMap.
- Scroll-wheel zoom, click-to-select, summary popup on the selected village's marker.
- A transient cyan marker shows where you just clicked until the new region's snapshot finishes loading.

### AI Insight

- Re-generated automatically on every region change.
- Consistent structure: `## Ringkasan Kondisi` → `## Potensi Risiko` → `## Rekomendasi`.
- **Model fallback chain**: `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash`. Each model has a separate free-tier quota, so a 429 on one model is automatically retried on the next.
- **Deterministic fallback**: if all three models are quota-exhausted, the API key is missing, or the network fails, RIKSIT generates a rule-based insight from the same data. A `via Gemini` / `via fallback` label is shown in the card corner.
- **Per-region cache**: successful Gemini results are cached for 10 minutes (matching the snapshot data window); fallback results are cached for only 2 minutes so Gemini gets retried sooner once the quota window recovers.

### Real-time earthquake feed

- Client-side polling of `/api/earthquake` every **90 seconds** while the tab is visible (`visibilitychange`-aware → pauses when the tab is backgrounded).
- Server-side cache of 60 seconds on `autogempa.json` → at most one upstream request per 90 seconds per server instance.
- A "Last check" timestamp is shown on the earthquake card.

---

## Data Sources

All endpoints are **free** and require no API key.

| Endpoint                                                               | Purpose                                                                         | Server cache TTL |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------- |
| `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={code}`            | Per-village weather forecast                                                    | 10 min           |
| `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json`                  | Latest earthquake                                                               | 60 s             |
| `https://air-quality-api.open-meteo.com/v1/air-quality`                | PM2.5, PM10, NO₂, O₃                                                            | 10 min           |
| `https://wilayah.id/api/{provinces\|regencies\|districts\|villages}/…` | Indonesian administrative regions (Kemendagri codes — identical to BMKG `adm4`) | 24 h             |
| `https://nominatim.openstreetmap.org/reverse?…`                        | Reverse geocoding (geolocate + map click)                                       | —                |

**Note on region codes:** RIKSIT uses **Kemendagri** codes (`32.10.07.1008`
style) which are **identical** to BMKG's `adm4` parameter. Avoid EMSIFA's
`api-wilayah-indonesia` — it uses a different numbering scheme that does not
match BMKG.

**Note on CORS:** `wilayah.id` does not send CORS headers, so RIKSIT proxies
every region lookup through `/api/region` (server-to-server, no CORS). The
proxy validates the `parent` format per level to prevent SSRF.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (client)                       │
│  RegionSelector ──┐                                          │
│  RegionMap ───────┤ user picks region / clicks the map       │
│  RiksitApp ───────┤                                          │
│                   ▼                                          │
│              /api/snapshot (one call per region change)      │
│              /api/insight  (one call per region change)      │
│              /api/earthquake (poll every 90 s)               │
│              /api/region (cascading dropdowns)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Server (Next.js API routes)                 │
│                                                              │
│   /api/snapshot   ─► getBmkgWeather()      [10 min cache]    │
│                   ─► getLatestEarthquake() [60 s cache]      │
│                   ─► getAirQuality()       [10 min cache]    │
│                                                              │
│   /api/insight    ─► route cache (10 m gemini / 2 m fallback)│
│                   ─► generateInsight()                       │
│                        ├─ gemini-2.5-flash                   │
│                        ├─ gemini-2.5-flash-lite (on 429)     │
│                        ├─ gemini-2.0-flash      (on 429)     │
│                        └─ buildFallback()       (deterministic)│
│                                                              │
│   /api/earthquake ─► reuses snapshot's earthquake cache      │
│                                                              │
│   /api/region     ─► wilayah.id proxy [24 h cache]           │
└─────────────────────────────────────────────────────────────┘
```

Every cache is an in-memory `Map` (see `src/lib/cache.ts`). Simple, zero deps,
scoped to a single Node.js process (per serverless instance when deployed to
Vercel). The insight cache is **shared across all users hitting the same
server** — the Gemini quota lives on the API key, so 100 users on one
deployment share one quota pool.

---

## Layout

**Desktop (≥ 1024 px):** Nemesis-style — map as the full canvas, all UI
floating on top. The overlay container uses `pointer-events: none` while the
inner panels are `pointer-events: auto`, so empty space between panels still
clicks through to the map. Overlay z-indexes are above 1000 so they don't get
covered by Leaflet's internal panes.

```
┌──────────────────────────────────────────────────────────┐
│  HEADER: RIKSIT · region label              ● Live data  │
├──────────────────────────────────────────────────────────┤
│      ┌────────────────────────────────┐                  │
│      │ Province │ Reg │ Dist │ Village│ ← selector bar  │
│      └────────────────────────────────┘                  │
│  ┌──────────┐                          ┌──────────────┐  │
│  │ AI       │                          │ Weather      │  │
│  │ INSIGHT  │      MAP (full canvas,   │ Forecast     │  │
│  │ (overlay │      click + zoom        │ Air Quality  │  │
│  │  panel)  │      interactive)        │ Earthquake   │  │
│  └──────────┘                          └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Mobile (< 1024 px):** plain vertical stack — selectors above the map, map at
~55 vh, then the insight and a 2×2 grid of the four data cards below.

The dual layout is rendered conditionally via
`matchMedia("(min-width:1024px)")`, not via CSS `display:none`, so only one
Leaflet instance is mounted at a time (Leaflet dislikes hidden containers).

---

## Performance Notes

- All external API fetches inside a route handler run in parallel via `Promise.all`.
- Leaflet and the map components are dynamic-imported with `ssr: false`.
- `useMapEvents` handlers are memoized so react-leaflet never detaches and reattaches them on re-render.
- Steady-state animation is just two small pulse dots (transform + opacity, GPU-composited).
- `prefers-reduced-motion` is honored: all non-essential animations turn off.

---

## Environment Variables

| Variable         | Required   | Description                                                                                                                                                                     |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | optional\* | Google Generative AI key. Used **server-side only**, never exposed to the browser. If absent or quota-exhausted, the app automatically uses its deterministic fallback insight. |

\* Technically optional. The app still runs without a key — the InsightCard
just shows `via fallback` and uses the deterministic generator.

### Getting a GEMINI_API_KEY

1. Visit https://aistudio.google.com/app/apikey
2. **Create API key** → copy the value.
3. Paste it into `.env.local`:

```env
GEMINI_API_KEY=YOUR_KEY_HERE
```

---

## Local Setup

```bash
# 1. Install deps
npm install

# 2. Copy the example env file and fill in GEMINI_API_KEY (or leave it blank)
cp .env.local.example .env.local

# 3. Start the dev server
npm run dev
```

Open http://localhost:3000.

## Build & Production

```bash
npm run typecheck   # TypeScript check
npm run build       # production build
npm run start       # serve the production build
```

---

## Project Structure

```
src/
  app/
    api/
      snapshot/route.ts     # GET — aggregates BMKG + Open-Meteo + autogempa
      insight/route.ts      # POST — Gemini chain + route cache
      earthquake/route.ts   # GET — slim endpoint for 90 s polling
      region/route.ts       # GET — wilayah.id proxy (CORS workaround)
    globals.css             # theme + glassmorphism + Leaflet overrides
    layout.tsx
    page.tsx
  components/
    RiksitApp.tsx           # app shell, dual layout (desktop overlay / mobile stack)
    Header.tsx              # logo + region label + live indicator
    Footer.tsx
    RegionSelector.tsx      # 4 cascading SearchableSelects + geolocate + sync
    SearchableSelect.tsx    # custom combobox (filter + arrow nav)
    MapPanel.tsx            # wrapper around RegionMap (bare / withSelector variant)
    RegionMap.tsx           # Leaflet map + click handler
    InsightCard.tsx         # markdown render + skeleton
    WeatherCard.tsx         # current weather
    ForecastCard.tsx        # 3-day forecast
    AirQualityCard.tsx      # PM2.5 + 3 pollutants
    EarthquakeCard.tsx      # earthquake + auto-refresh indicator
    WarningBanner.tsx       # early warning banner (when active)
    CardShell.tsx           # card frame with glass border
    Skeleton.tsx            # shimmer loading skeleton
  lib/
    types.ts                # type definitions
    cache.ts                # in-memory cache utility with TTL
    fetcher.ts              # fetch wrapper with timeout + AbortSignal chaining
    client-api.ts           # client helpers: fetchSnapshot/Insight/Earthquake
    region-api.ts           # client wrapper for /api/region
    region-resolver.ts      # coordinates → region (Nominatim + wilayah walk)
    nominatim.ts            # client reverse-geocode wrapper
    bmkg.ts                 # server-side BMKG client (weather + earthquake)
    open-meteo.ts           # server-side Open-Meteo client + PM2.5 band
    gemini.ts               # server-side Gemini client + model chain + fallback
    markdown.ts             # escaping markdown → HTML renderer
    icons.tsx               # SVG icon set
```

---

## Roadmap

- **Community reports** via Supabase — citizen environmental observations with simple moderation, surfaced as aggregates on the map.
- **Push notifications** for early warnings.
- **Historical trends** with persistent storage.
- **Polygon-following highlight** on click (Nominatim `polygon_geojson=1`) — kept off for now for CPU reasons.
- Per-user / per-IP rate limiter on the insight endpoint for public deployments.

---

## Attribution

- Weather and earthquake data © **BMKG** (Indonesian Meteorology, Climatology, and Geophysics Agency)
- Air quality data © **Open-Meteo / CAMS**
- Region data © **wilayah.id** (Kemendagri code scheme)
- Map tiles © **OpenStreetMap contributors**, **CARTO**

Portfolio project — feel free to use it as a reference.
