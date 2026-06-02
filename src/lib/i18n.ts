// Pure i18n core — no React, no DOM. Safe to import from anywhere (client UI,
// server API routes, server-side AI prompt builders). The React context that
// surfaces the current locale lives in src/components/LocaleProvider.tsx.

export type Locale = "id-ID" | "en-US";

export const LOCALES: readonly Locale[] = ["id-ID", "en-US"] as const;
export const DEFAULT_LOCALE: Locale = "id-ID";

export const LOCALE_LABELS: Record<Locale, { native: string; short: string; htmlLang: string }> = {
  "id-ID": { native: "Bahasa Indonesia", short: "ID", htmlLang: "id" },
  "en-US": { native: "English", short: "EN", htmlLang: "en" },
};

export function isLocale(s: string | null | undefined): s is Locale {
  return s === "id-ID" || s === "en-US";
}

// All translatable strings, keyed flat with dot-separated namespaces. Adding
// a new key here forces both dictionaries below to provide it (Record<Dict>).
interface Dict {
  "header.live": string;
  "header.standby": string;
  "header.subtitle": string;
  "footer.tagline": string;

  "weather.title": string;
  "weather.unavailable": string;
  "weather.update": string;
  "weather.humidity": string;
  "weather.wind": string;
  "weather.cloud": string;

  "forecast.title": string;
  "forecast.unavailable": string;

  "airQuality.title": string;
  "airQuality.unavailable": string;
  "airQuality.band.good": string;
  "airQuality.band.moderate": string;
  "airQuality.band.unhealthy": string;
  "airQuality.band.veryUnhealthy": string;
  "airQuality.band.hazardous": string;
  "airQuality.band.unknown": string;

  "earthquake.title": string;
  "earthquake.unavailable": string;
  "earthquake.lastCheck": string;

  "warning.heading": string;

  "insight.title": string;
  "insight.regionPlaceholder": string;
  "insight.generated": string;
  "insight.source.gemini": string;
  "insight.source.groq": string;
  "insight.source.fallback": string;
  "insight.loading": string;
  "insight.errorPrefix": string;

  "region.placeholder.province": string;
  "region.placeholder.regency": string;
  "region.placeholder.district": string;
  "region.placeholder.village": string;
  "region.aria.province": string;
  "region.aria.regency": string;
  "region.aria.district": string;
  "region.aria.village": string;
  "region.title.province": string;
  "region.title.regency": string;
  "region.title.district": string;
  "region.title.village": string;
  "region.locating": string;
  "region.defaultFallback": string;
  "region.detected": string;
  "region.detectedProvince": string;
  "region.hint": string;

  "select.noResults": string;

  "disclaimer.title": string;
  "disclaimer.intro": string;
  "disclaimer.warning": string;
  "disclaimer.emergency": string;
  "disclaimer.ack": string;

  "language.switcherAria": string;
  "language.short.id": string;
  "language.short.en": string;

  "app.dataError": string;
  "app.dataErrorShort": string;
}

export type DictKey = keyof Dict;

const DICTIONARY: Record<Locale, Dict> = {
  "id-ID": {
    "header.live": "Data Langsung",
    "header.standby": "Siaga",
    "header.subtitle": "Environmental AI",
    "footer.tagline": "Observe. Understand. Act.",

    "weather.title": "Cuaca Saat Ini",
    "weather.unavailable": "Data cuaca BMKG tidak tersedia untuk wilayah ini.",
    "weather.update": "upd",
    "weather.humidity": "Lembap",
    "weather.wind": "Angin",
    "weather.cloud": "Awan",

    "forecast.title": "Prakiraan 3 Hari",
    "forecast.unavailable": "Prakiraan belum tersedia.",

    "airQuality.title": "Kualitas Udara",
    "airQuality.unavailable": "Data tidak tersedia.",
    "airQuality.band.good": "Baik",
    "airQuality.band.moderate": "Sedang",
    "airQuality.band.unhealthy": "Tidak Sehat",
    "airQuality.band.veryUnhealthy": "Sangat Tidak Sehat",
    "airQuality.band.hazardous": "Berbahaya",
    "airQuality.band.unknown": "Tidak Tersedia",

    "earthquake.title": "Gempa Terbaru",
    "earthquake.unavailable": "Tidak ada data gempa terbaru.",
    "earthquake.lastCheck": "Pengecekan terakhir",

    "warning.heading": "Peringatan Dini",

    "insight.title": "AI Environmental Insight",
    "insight.regionPlaceholder": "Memuat lokasi...",
    "insight.generated": "Dibuat",
    "insight.source.gemini": "via Gemini",
    "insight.source.groq": "via Groq",
    "insight.source.fallback": "via fallback",
    "insight.loading": "Memuat wawasan...",
    "insight.errorPrefix": "Gagal memuat wawasan",

    "region.placeholder.province": "— Provinsi —",
    "region.placeholder.regency": "— Kab/Kota —",
    "region.placeholder.district": "— Kecamatan —",
    "region.placeholder.village": "— Desa/Kel —",
    "region.aria.province": "Pilih provinsi",
    "region.aria.regency": "Pilih kabupaten atau kota",
    "region.aria.district": "Pilih kecamatan",
    "region.aria.village": "Pilih desa atau kelurahan",
    "region.title.province": "Provinsi",
    "region.title.regency": "Kab/Kota",
    "region.title.district": "Kecamatan",
    "region.title.village": "Desa/Kel",
    "region.locating": "Mendeteksi lokasi...",
    "region.defaultFallback": "Menggunakan wilayah default: Majalengka.",
    "region.detected": "Lokasi terdeteksi: {regency}, {province}.",
    "region.detectedProvince": "Lokasi terdeteksi: {province}.",
    "region.hint": "Pilih wilayah dari dropdown atau klik peta",

    "select.noResults": "Tidak ada hasil",

    "disclaimer.title": "Selamat Datang di RIKSIT",
    "disclaimer.intro":
      "RIKSIT menggunakan **AI generatif** untuk merangkum data lingkungan dari **BMKG**, **Open-Meteo**, dan sumber publik lainnya menjadi wawasan singkat.",
    "disclaimer.warning":
      "Wawasan AI **tidak selalu 100% akurat** dan tidak menggantikan informasi resmi dari **BMKG**, **BPBD**, atau otoritas setempat. Gunakan sebagai pendamping, bukan satu-satunya rujukan untuk keputusan penting.",
    "disclaimer.emergency":
      "Untuk keadaan darurat, hubungi **112** atau kanal resmi BPBD setempat.",
    "disclaimer.ack": "Saya Mengerti",

    "language.switcherAria": "Ubah bahasa antarmuka",
    "language.short.id": "ID",
    "language.short.en": "EN",

    "app.dataError": "Gagal memuat data lingkungan",
    "app.dataErrorShort": "Gagal memuat data",
  },
  "en-US": {
    "header.live": "Live data",
    "header.standby": "Standby",
    "header.subtitle": "Environmental AI",
    "footer.tagline": "Observe. Understand. Act.",

    "weather.title": "Current Weather",
    "weather.unavailable": "BMKG weather data is not available for this region.",
    "weather.update": "upd",
    "weather.humidity": "Humidity",
    "weather.wind": "Wind",
    "weather.cloud": "Cloud",

    "forecast.title": "3-Day Forecast",
    "forecast.unavailable": "Forecast not available.",

    "airQuality.title": "Air Quality",
    "airQuality.unavailable": "Data not available.",
    "airQuality.band.good": "Good",
    "airQuality.band.moderate": "Moderate",
    "airQuality.band.unhealthy": "Unhealthy",
    "airQuality.band.veryUnhealthy": "Very Unhealthy",
    "airQuality.band.hazardous": "Hazardous",
    "airQuality.band.unknown": "Not Available",

    "earthquake.title": "Latest Earthquake",
    "earthquake.unavailable": "No recent earthquake data.",
    "earthquake.lastCheck": "Last check",

    "warning.heading": "Early Warning",

    "insight.title": "AI Environmental Insight",
    "insight.regionPlaceholder": "Loading location...",
    "insight.generated": "Generated",
    "insight.source.gemini": "via Gemini",
    "insight.source.groq": "via Groq",
    "insight.source.fallback": "via fallback",
    "insight.loading": "Loading insight...",
    "insight.errorPrefix": "Failed to load insight",

    "region.placeholder.province": "— Province —",
    "region.placeholder.regency": "— Regency/City —",
    "region.placeholder.district": "— District —",
    "region.placeholder.village": "— Village —",
    "region.aria.province": "Select province",
    "region.aria.regency": "Select regency or city",
    "region.aria.district": "Select district",
    "region.aria.village": "Select village",
    "region.title.province": "Province",
    "region.title.regency": "Regency/City",
    "region.title.district": "District",
    "region.title.village": "Village",
    "region.locating": "Detecting location...",
    "region.defaultFallback": "Using default region: Majalengka.",
    "region.detected": "Location detected: {regency}, {province}.",
    "region.detectedProvince": "Location detected: {province}.",
    "region.hint": "Pick a region from the dropdown or click the map",

    "select.noResults": "No results",

    "disclaimer.title": "Welcome to RIKSIT",
    "disclaimer.intro":
      "RIKSIT uses **generative AI** to summarize environmental data from **BMKG**, **Open-Meteo**, and other public sources into a concise insight.",
    "disclaimer.warning":
      "AI insight is **not always 100% accurate** and does not replace official information from **BMKG**, **BPBD**, or local authorities. Use as a companion, not the sole reference for important decisions.",
    "disclaimer.emergency":
      "For emergencies, call **112** or the official BPBD channel for your area.",
    "disclaimer.ack": "I Understand",

    "language.switcherAria": "Change interface language",
    "language.short.id": "ID",
    "language.short.en": "EN",

    "app.dataError": "Failed to load environmental data",
    "app.dataErrorShort": "Failed to load data",
  },
};

/** Pure translation lookup. Falls back to the default locale, then to the key itself. */
export function translate(
  locale: Locale,
  key: DictKey,
  vars?: Record<string, string | number>,
): string {
  const entry = DICTIONARY[locale][key] ?? DICTIONARY[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return entry;
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    entry,
  );
}

/** Convert a Locale to its short BCP-47-ish html `lang` value (`id` / `en`). */
export function htmlLang(locale: Locale): string {
  return LOCALE_LABELS[locale].htmlLang;
}
