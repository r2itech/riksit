// Open-Meteo air quality client.
import type { AirQuality } from "./types";
import { withCache } from "./cache";
import { fetchJson } from "./fetcher";
import { translate, type Locale } from "./i18n";

export type Pm25Tone =
  | "good"
  | "moderate"
  | "unhealthy"
  | "veryUnhealthy"
  | "hazardous"
  | "unknown";

const TEN_MIN = 10 * 60 * 1000;

interface OpenMeteoAirRaw {
  hourly?: {
    time?: string[];
    pm2_5?: (number | null)[];
    pm10?: (number | null)[];
    nitrogen_dioxide?: (number | null)[];
    ozone?: (number | null)[];
  };
}

export async function getAirQuality(lat: number, lon: number): Promise<AirQuality | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const key = `air:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  return withCache(key, TEN_MIN, async () => {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&hourly=pm2_5,pm10,nitrogen_dioxide,ozone&timezone=auto`;
    let raw: OpenMeteoAirRaw;
    try {
      raw = await fetchJson<OpenMeteoAirRaw>(url, { timeoutMs: 8000 });
    } catch (err) {
      console.warn("[open-meteo] fetch failed", err);
      return null;
    }
    const hourly = raw.hourly;
    if (!hourly?.time || hourly.time.length === 0) return null;
    // Pick the sample at or just before "now".
    const now = Date.now();
    let idx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < hourly.time.length; i++) {
      const t = Date.parse(hourly.time[i]);
      if (Number.isNaN(t)) continue;
      const diff = Math.abs(now - t);
      if (diff < bestDiff) {
        bestDiff = diff;
        idx = i;
      }
    }
    const pick = (arr?: (number | null)[]) => {
      const v = arr?.[idx];
      return v === undefined || v === null ? null : Number(v);
    };
    return {
      pm2_5: pick(hourly.pm2_5),
      pm10: pick(hourly.pm10),
      no2: pick(hourly.nitrogen_dioxide),
      o3: pick(hourly.ozone),
      time: hourly.time[idx] ?? null,
    };
  });
}

/** Map PM2.5 (µg/m³) to a categorical band per WHO/Open-Meteo guidance. */
export function pm25Band(pm: number | null): { tone: Pm25Tone } {
  if (pm === null || !Number.isFinite(pm)) return { tone: "unknown" };
  if (pm <= 12) return { tone: "good" };
  if (pm <= 35.4) return { tone: "moderate" };
  if (pm <= 55.4) return { tone: "unhealthy" };
  if (pm <= 150.4) return { tone: "veryUnhealthy" };
  return { tone: "hazardous" };
}

/** Locale-aware human-readable label for a PM2.5 tone. */
export function pm25BandLabel(tone: Pm25Tone, locale: Locale): string {
  return translate(locale, `airQuality.band.${tone}`);
}
