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

| Category      | Choice                                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| Framework     | **Next.js 14** (App Router) + **TypeScript**                                           |
| Styling       | **Tailwind CSS** (custom dark + neon theme, glassmorphism)                             |
| Map           | **Leaflet** + **react-leaflet** with **CARTO Dark** tiles                              |
| AI            | **Google Gemini API** primary, **Groq API** secondary fallback (both server-side only) |
| Markdown      | Tiny in-house renderer (`src/lib/markdown.ts`) — no extra deps                         |
| UI components | Custom (`SearchableSelect`, `CardShell`, etc.) — no external UI library                |
| Formatting    | **Prettier** + **ESLint** (`next/core-web-vitals` + `eslint-config-prettier`)          |
| Testing       | **Vitest** (TS-native, no transformer config required)                                 |

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
- **Provider chain**: Gemini first, Groq as a secondary AI fallback, deterministic rule-based generator as the last resort.
  - **Gemini chain**: `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash`.
  - **Groq chain**: `llama-3.3-70b-versatile` → `gemma2-9b-it`.
  - Each model in each chain has its own free-tier quota, so a 429 on one model is automatically retried on the next, and a quota-exhausted Gemini chain falls through to Groq before the deterministic fallback runs.
- **Deterministic fallback**: if both AI chains are quota-exhausted, both keys are missing, or every network call fails, RIKSIT generates a rule-based insight from the same data. A `via Gemini` / `via Groq` / `via fallback` label is shown in the card corner.
- **Per-region cache**: successful AI results (Gemini or Groq) are cached for 10 minutes (matching the snapshot data window); fallback results are cached for only 2 minutes so the AI providers get retried sooner once a quota window recovers.

### Real-time earthquake feed

- Client-side polling of `/api/earthquake` every **90 seconds** while the tab is visible (`visibilitychange`-aware → pauses when the tab is backgrounded).
- Server-side cache of 60 seconds on `autogempa.json` → at most one upstream request per 90 seconds per server instance.
- A "Last check" timestamp is shown on the earthquake card.

### AI accuracy disclaimer

- On every launch and refresh, a modal reminds users that the AI-generated insight is **not always 100% accurate** and does not replace official information from BMKG, BPBD, or local authorities.
- Dismissed in-session by clicking "Saya Mengerti" or pressing <kbd>Esc</kbd>; no localStorage flag, so the acknowledgment is intentionally not remembered between sessions — users see the disclaimer every time they reload the app.
- Modal locks page scroll and focuses the acknowledge button so it's both visually and keyboard-accessible.

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
│   /api/insight    ─► route cache (10 m AI / 2 m fallback)    │
│                   ─► generateInsight()  [lib/ai]             │
│                        iterates PROVIDERS:                   │
│                        ├─ geminiProvider                     │
│                        │    ├─ gemini-2.5-flash              │
│                        │    ├─ gemini-2.5-flash-lite (429)   │
│                        │    └─ gemini-2.0-flash       (429)  │
│                        ├─ groqProvider (if Gemini fails)     │
│                        │    ├─ llama-3.3-70b-versatile       │
│                        │    └─ gemma2-9b-it           (429)  │
│                        └─ buildFallback()    (deterministic) │
│                                                              │
│   /api/earthquake ─► reuses snapshot's earthquake cache      │
│                                                              │
│   /api/region     ─► wilayah.id proxy [24 h cache]           │
└─────────────────────────────────────────────────────────────┘
```

Every cache is an in-memory `Map` (see `src/lib/cache.ts`). Simple, zero deps,
scoped to a single Node.js process (per serverless instance when deployed to
Vercel). The insight cache is **shared across all users hitting the same
server** — both the Gemini and Groq quotas live on their API keys, so 100
users on one deployment share each provider's quota pool.

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

| Variable         | Required   | Description                                                                                                                                                                                                                               |
| ---------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | optional\* | Google Generative AI key. Used **server-side only**, never exposed to the browser. Absent ⇒ the Gemini chain is skipped and Groq is attempted first.                                                                                      |
| `GROQ_API_KEY`   | optional\* | Groq API key. Used **server-side only**, never exposed to the browser. Acts as the secondary AI fallback when the Gemini chain is exhausted. Absent ⇒ skipped and the deterministic generator takes over once Gemini is also unavailable. |

\* Technically optional. The app still runs without either key — the
InsightCard just shows `via fallback` and uses the deterministic generator.
With only `GEMINI_API_KEY` set the app behaves as before. With only
`GROQ_API_KEY` set, Groq becomes the primary AI source.

### Getting a GEMINI_API_KEY

1. Visit https://aistudio.google.com/app/apikey
2. **Create API key** → copy the value.
3. Paste it into `.env.local`:

```env
GEMINI_API_KEY=YOUR_KEY_HERE
```

### Getting a GROQ_API_KEY

1. Visit https://console.groq.com/keys
2. **Create API Key** → copy the value.
3. Paste it into `.env.local`:

```env
GROQ_API_KEY=YOUR_KEY_HERE
```

---

## Local Setup

```bash
# 1. Install deps
npm install

# 2. Copy the example env file and fill in GEMINI_API_KEY and/or GROQ_API_KEY
#    (both optional — leave blank to use the deterministic fallback)
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

## Code Quality

Formatting and linting are wired together so they never fight: ESLint enforces
the linting rules (`next/core-web-vitals`) and `eslint-config-prettier` turns
off any ESLint stylistic rule that would conflict with Prettier. Prettier owns
all whitespace / wrapping decisions.

```bash
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier — rewrite all files
npm run format:check  # Prettier — fail if anything is unformatted (CI-friendly)
```

Config lives in `.prettierrc`, `.prettierignore`, and `.eslintrc.json`. Most
IDEs (VS Code with the Prettier extension, JetBrains, etc.) pick these up
automatically — turn on "format on save" and you're done.

---

## Testing

Unit tests run on **Vitest**. Vitest handles TypeScript + ESM natively, so
there's no transform config to maintain. Tests live alongside the lib code in
`src/lib/__tests__/` and execute in the Node environment.

```bash
npm test              # single run (CI-friendly)
npm run test:watch    # re-run on file change
```

What's covered today (6 files, ~65 tests, runs in ~1.5 s):

| File                 | Module under test                             | Highlights                                                                                                                                                                                           |
| -------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `markdown.test.ts`   | `src/lib/markdown.ts`                         | HTML escaping (XSS safety), headings, bold/italic/code, lists, paragraph grouping, end-to-end Gemini insight render                                                                                  |
| `cache.test.ts`      | `src/lib/cache.ts`                            | TTL hit/miss, expiry on advance, null/undefined skipped, per-key isolation, `invalidate()` (global + prefix)                                                                                         |
| `open-meteo.test.ts` | `src/lib/open-meteo.ts`                       | `pm25Band` boundary thresholds (12 / 35.4 / 55.4 / 150.4) + null / NaN / Infinity                                                                                                                    |
| `bmkg.test.ts`       | `src/lib/bmkg.ts`                             | `buildForecast` grouping, min/max, midday picker, `days` limit; `getEarlyWarnings` only matches severe codes for _today_                                                                             |
| `region-api.test.ts` | `src/lib/region-api.ts`                       | `normalizeName` strips every admin prefix (Kabupaten / Kota Adm. / DKI / Daerah Istimewa); `findRegencyByName` exact + partial + Jakarta-form interop                                                |
| `fallback.test.ts`   | `src/lib/ai/fallback.ts` (`buildFallback`)    | Heading structure, conditional risks (high temp / humidity / severe weather / unhealthy PM2.5 / M ≥ 5 quakes), no-risk fallthrough, missing-data robustness                                          |
| `chain.test.ts`      | `src/lib/ai/chain.ts` + `src/lib/ai/index.ts` | `runProviderChain` no-key short-circuit parametrized across every provider (absent / empty / whitespace / quotes-only); `generateInsight` returns the deterministic fallback when no AI keys are set |

**Not yet covered (deliberately):** React components and Next.js API routes —
those want integration tests (React Testing Library + jsdom, or a Next.js
HTTP test runner), which is a separate setup from unit tests.

---

## Project Structure

```
src/
  app/
    api/
      snapshot/route.ts     # GET — aggregates BMKG + Open-Meteo + autogempa
      insight/route.ts      # POST — Gemini → Groq → fallback orchestration + route cache
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
    DisclaimerModal.tsx     # AI accuracy disclaimer (shown every launch, no persistence)
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
    ai/                     # server-side AI insight registry + chain runner
      index.ts              #   generateInsight() — orchestrator + PROVIDERS list
      chain.ts              #   AIProvider interface + runProviderChain (shared loop)
      prompt.ts             #   SYSTEM_PROMPT + summarizeSnapshot (shared)
      fallback.ts           #   deterministic rule-based buildFallback
      gemini.ts             #   geminiProvider config
      groq.ts               #   groqProvider config
    markdown.ts             # escaping markdown → HTML renderer
    icons.tsx               # SVG icon set
    __tests__/
      markdown.test.ts      # Vitest — XSS-safe markdown rendering
      cache.test.ts         # Vitest — TTL + invalidate + null-skip semantics
      open-meteo.test.ts    # Vitest — pm25Band thresholds
      bmkg.test.ts          # Vitest — forecast grouping + early-warning detection
      region-api.test.ts    # Vitest — normalizeName + findRegencyByName
      fallback.test.ts      # Vitest — buildFallback structure + risk detection
      chain.test.ts         # Vitest — runProviderChain no-key short-circuit (parametrized) + generateInsight fallback

# Root-level config
.prettierrc                 # Prettier formatting rules
.prettierignore             # files Prettier should ignore
.eslintrc.json              # ESLint config (next/core-web-vitals + prettier)
vitest.config.ts            # Vitest config (node env, tsconfig path resolution)
tailwind.config.ts          # Tailwind theme + custom colors / animations
next.config.mjs             # Next.js config
tsconfig.json               # TypeScript config (path alias @/* → src/*)
```

---

---

## Attribution

- Weather and earthquake data © **BMKG** (Indonesian Meteorology, Climatology, and Geophysics Agency)
- Air quality data © **Open-Meteo / CAMS**
- Region data © **wilayah.id** (Kemendagri code scheme)
- Map tiles © **OpenStreetMap contributors**, **CARTO**

Portfolio project — feel free to use it as a reference.
