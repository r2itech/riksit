// Server-side BMKG client.
import type { BmkgWeather, Earthquake, ForecastDay, WeatherSample } from "./types";
import { withCache } from "./cache";
import { fetchJson } from "./fetcher";

const TEN_MIN = 10 * 60 * 1000;
// Earthquake data is genuinely time-sensitive — keep the server cache short so
// the client-side poll (every ~90 s) actually surfaces new events promptly.
const ONE_MIN = 60 * 1000;

// Loose typing for the public BMKG response — fields can shift; we read defensively.
interface BmkgRawSample {
  datetime?: string;
  utc_datetime?: string;
  local_datetime?: string;
  t?: number;
  hu?: number;
  ws?: number;
  wd?: string;
  wd_to?: string;
  tcc?: number;
  vs_text?: string;
  weather?: number;
  weather_desc?: string;
  weather_desc_en?: string;
  image?: string;
}
interface BmkgRawResponse {
  lokasi?: {
    provinsi?: string;
    kotkab?: string;
    kecamatan?: string;
    desa?: string;
    lon?: number;
    lat?: number;
    timezone?: string;
  };
  data?: Array<{
    lokasi?: BmkgRawResponse["lokasi"];
    cuaca?: BmkgRawSample[][];
  }>;
}

function normalizeSample(raw: BmkgRawSample): WeatherSample | null {
  const dt = raw.local_datetime || raw.datetime;
  if (!dt) return null;
  return {
    datetime: dt,
    utc_datetime: raw.utc_datetime ?? dt,
    t: typeof raw.t === "number" ? raw.t : Number(raw.t ?? 0),
    hu: typeof raw.hu === "number" ? raw.hu : Number(raw.hu ?? 0),
    ws: typeof raw.ws === "number" ? raw.ws : Number(raw.ws ?? 0),
    wd: raw.wd ?? raw.wd_to ?? "-",
    tcc: typeof raw.tcc === "number" ? raw.tcc : Number(raw.tcc ?? 0),
    vs_text: raw.vs_text ?? "-",
    weather: typeof raw.weather === "number" ? raw.weather : Number(raw.weather ?? 0),
    weather_desc: raw.weather_desc ?? "-",
    weather_desc_en: raw.weather_desc_en,
    image: raw.image,
  };
}

export async function getBmkgWeather(adm4: string): Promise<BmkgWeather | null> {
  return withCache(`bmkg:weather:${adm4}`, TEN_MIN, async () => {
    const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`;
    let raw: BmkgRawResponse;
    try {
      raw = await fetchJson<BmkgRawResponse>(url, { timeoutMs: 9000 });
    } catch (err) {
      console.warn("[bmkg] weather fetch failed", err);
      return null;
    }
    const first = raw.data?.[0];
    const lokasi = raw.lokasi ?? first?.lokasi;
    if (!lokasi || !first?.cuaca) return null;

    const samples: WeatherSample[] = [];
    for (const day of first.cuaca) {
      if (!Array.isArray(day)) continue;
      for (const s of day) {
        const n = normalizeSample(s);
        if (n) samples.push(n);
      }
    }
    samples.sort((a, b) => a.datetime.localeCompare(b.datetime));

    return {
      location: {
        provinsi: lokasi.provinsi ?? "-",
        kotkab: lokasi.kotkab ?? "-",
        kecamatan: lokasi.kecamatan ?? "-",
        desa: lokasi.desa ?? "-",
        lon: lokasi.lon ?? 0,
        lat: lokasi.lat ?? 0,
        timezone: lokasi.timezone ?? "Asia/Jakarta",
      },
      samples,
    };
  });
}

/** Group samples into per-day forecast cards with midday representative + min/max. */
export function buildForecast(weather: BmkgWeather | null, days = 3): ForecastDay[] {
  if (!weather || weather.samples.length === 0) return [];
  const byDay = new Map<string, WeatherSample[]>();
  for (const s of weather.samples) {
    const date = s.datetime.slice(0, 10);
    const bucket = byDay.get(date);
    if (bucket) bucket.push(s);
    else byDay.set(date, [s]);
  }
  const dates = Array.from(byDay.keys()).sort();
  const result: ForecastDay[] = [];
  for (const date of dates.slice(0, days)) {
    const list = byDay.get(date)!;
    let mid: WeatherSample = list[0];
    let minDist = Infinity;
    for (const s of list) {
      const hour = Number(s.datetime.slice(11, 13));
      const dist = Math.abs(hour - 12);
      if (dist < minDist) {
        minDist = dist;
        mid = s;
      }
    }
    const temps = list.map((s) => s.t);
    result.push({
      date,
      dayLabel: formatDayLabel(date),
      sample: mid,
      tMin: Math.round(Math.min(...temps)),
      tMax: Math.round(Math.max(...temps)),
    });
  }
  return result;
}

function formatDayLabel(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

// The autogempa endpoint returns fields in PascalCase — keep that shape here so
// the mapping into our lowercase Earthquake type stays explicit.
interface RawGempa {
  Tanggal?: string;
  Jam?: string;
  DateTime?: string;
  Coordinates?: string;
  Lintang?: string;
  Bujur?: string;
  Magnitude?: string;
  Kedalaman?: string;
  Wilayah?: string;
  Potensi?: string;
  Dirasakan?: string;
}
interface AutoGempaResponse {
  Infogempa?: { gempa?: RawGempa };
}

export async function getLatestEarthquake(): Promise<Earthquake | null> {
  return withCache(`bmkg:autogempa`, ONE_MIN, async () => {
    try {
      const raw = await fetchJson<AutoGempaResponse>(
        "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
        { timeoutMs: 8000 },
      );
      const g = raw.Infogempa?.gempa;
      if (!g) return null;
      return {
        tanggal: g.Tanggal ?? "-",
        jam: g.Jam ?? "-",
        datetime: g.DateTime ?? new Date().toISOString(),
        coordinates: g.Coordinates ?? "-",
        lintang: g.Lintang ?? "-",
        bujur: g.Bujur ?? "-",
        magnitude: g.Magnitude ?? "-",
        kedalaman: g.Kedalaman ?? "-",
        wilayah: g.Wilayah ?? "-",
        potensi: g.Potensi ?? "-",
        dirasakan: g.Dirasakan,
      };
    } catch (err) {
      console.warn("[bmkg] earthquake fetch failed", err);
      return null;
    }
  });
}

/**
 * Extract weather-warning style notes from BMKG's prakiraan-cuaca response.
 * The public prakiraan-cuaca endpoint does not always carry alerts; we look for
 * severe weather codes within today's samples as a pragmatic substitute.
 */
export async function getEarlyWarnings(weather: BmkgWeather | null) {
  if (!weather) return [];
  const today = new Date().toISOString().slice(0, 10);
  const todays = weather.samples.filter((s) => s.datetime.startsWith(today));
  // BMKG severe codes (very rough): 17 hujan petir, 95 thunderstorm, 60 hujan lebat
  const severeCodes = new Set([17, 60, 95, 97]);
  const flagged = todays.filter((s) => severeCodes.has(s.weather));
  if (flagged.length === 0) return [];
  return [
    {
      province: weather.location.provinsi,
      headline: `Potensi cuaca buruk di ${weather.location.kecamatan}, ${weather.location.kotkab}`,
      description: flagged
        .map((s) => `${s.datetime.slice(11, 16)} — ${s.weather_desc}`)
        .join(" • "),
      effective: flagged[0].datetime,
      expires: flagged[flagged.length - 1].datetime,
      severity: "moderate",
    },
  ];
}
