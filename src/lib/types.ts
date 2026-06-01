// Shared type definitions for RIKSIT.

// Region codes follow the Kemendagri / BMKG dot-separated scheme:
//   province  "31"
//   regency   "31.71"
//   district  "31.71.01"
//   village   "31.71.01.1001"
// The village code is identical to BMKG's `adm4` parameter, which is why we
// can pass it straight to the prakiraan-cuaca endpoint without conversion.

export interface Province {
  code: string;
  name: string;
}
export interface Regency {
  code: string;
  name: string;
}
export interface District {
  code: string;
  name: string;
}
export interface Village {
  code: string;
  name: string;
}

export interface RegionSelection {
  province: Province | null;
  regency: Regency | null;
  district: District | null;
  village: Village | null;
}

/** Type guard for a properly formatted village (adm4) code. */
export function isVillageCode(s: string): boolean {
  return /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(s);
}

/** Single weather sample from BMKG `prakiraan-cuaca`. */
export interface WeatherSample {
  /** ISO-ish local datetime, e.g. 2024-05-23 06:00:00 */
  datetime: string;
  /** UTC datetime, ISO 8601. */
  utc_datetime: string;
  /** Temperature in °C. */
  t: number;
  /** Humidity %. */
  hu: number;
  /** Wind speed km/h. */
  ws: number;
  /** Wind direction text (e.g. N, NE). */
  wd: string;
  /** Total cloud cover %. */
  tcc: number;
  /** Visibility text. */
  vs_text: string;
  /** Weather code (BMKG). */
  weather: number;
  /** Weather text. */
  weather_desc: string;
  weather_desc_en?: string;
  /** Icon URL from BMKG. */
  image?: string;
}

export interface BmkgWeather {
  location: {
    provinsi: string;
    kotkab: string;
    kecamatan: string;
    desa: string;
    lon: number;
    lat: number;
    timezone: string;
  };
  /** Flat list of upcoming weather samples, sorted ascending. */
  samples: WeatherSample[];
}

export interface ForecastDay {
  date: string; // YYYY-MM-DD
  dayLabel: string;
  /** Representative midday sample. */
  sample: WeatherSample;
  tMin: number;
  tMax: number;
}

export interface AirQuality {
  pm2_5: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  time: string | null;
}

export interface Earthquake {
  tanggal: string;
  jam: string;
  datetime: string;
  coordinates: string;
  lintang: string;
  bujur: string;
  magnitude: string;
  kedalaman: string;
  wilayah: string;
  potensi: string;
  dirasakan?: string;
}

export interface EarlyWarning {
  province: string;
  headline: string;
  description: string;
  effective: string;
  expires: string;
  severity: string;
}

export interface EnvironmentalSnapshot {
  region: {
    provinceName: string;
    regencyName: string;
    districtName: string;
    villageName: string;
    lat: number;
    lon: number;
  };
  weather: BmkgWeather | null;
  forecast: ForecastDay[];
  airQuality: AirQuality | null;
  earthquake: Earthquake | null;
  warnings: EarlyWarning[];
}

export interface InsightPayload {
  generatedAt: string;
  text: string;
  source: "gemini" | "fallback";
}
