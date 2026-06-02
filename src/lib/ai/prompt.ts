// Shared prompt scaffolding for every AI provider. Two locale variants of the
// system prompt + snapshot summary so the AI generates its output in the
// language the user selected in the UI. The deterministic fallback
// (lib/ai/fallback.ts) follows the same structured-markdown contract so the
// rendered InsightCard looks identical regardless of source.
import type { EnvironmentalSnapshot } from "../types";
import { pm25Band, pm25BandLabel } from "../open-meteo";
import type { Locale } from "../i18n";

const SYSTEM_PROMPT_ID = `Anda adalah RIKSIT, asisten kecerdasan lingkungan untuk Indonesia.
Berikan jawaban dalam Bahasa Indonesia yang ringkas, akurat, dan actionable.
Selalu kembalikan struktur Markdown berikut—tanpa awalan apa pun:

## Ringkasan Kondisi
Paragraf singkat 2-3 kalimat tentang kondisi lingkungan saat ini.

## Potensi Risiko
Daftar poin (-) berisi risiko atau anomali yang terdeteksi. Jika tidak ada, tulis "- Tidak ada risiko signifikan yang terdeteksi."

## Rekomendasi
Daftar poin (-) berisi tindakan praktis untuk warga di wilayah ini.
Gunakan **tebal** untuk istilah penting dan *miring* untuk angka kunci.`;

const SYSTEM_PROMPT_EN = `You are RIKSIT, an environmental intelligence assistant for Indonesia.
Respond in concise, accurate, actionable English.
Always return the following Markdown structure—no preamble:

## Current Conditions
A short paragraph of 2-3 sentences describing the current environmental conditions.

## Potential Risks
A bullet list (-) of risks or anomalies detected. If none, write "- No significant risks detected."

## Recommendations
A bullet list (-) of practical actions for residents in this area.
Use **bold** for key terms and *italics* for key figures.`;

const SUMMARY_USER_PROMPT_ID = `Berdasarkan data di atas, susun wawasan lingkungan untuk warga setempat.`;
const SUMMARY_USER_PROMPT_EN = `Based on the data above, compose an environmental insight for local residents.`;

export function getSystemPrompt(locale: Locale): string {
  return locale === "en-US" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ID;
}

export function getUserCallToAction(locale: Locale): string {
  return locale === "en-US" ? SUMMARY_USER_PROMPT_EN : SUMMARY_USER_PROMPT_ID;
}

export function getContextHeader(locale: Locale): string {
  return locale === "en-US" ? "Current environmental data:" : "Data lingkungan saat ini:";
}

export function summarizeSnapshot(s: EnvironmentalSnapshot, locale: Locale): string {
  const isEn = locale === "en-US";
  const now = s.weather?.samples[0];
  const region = `${s.region.districtName}, ${s.region.regencyName}, ${s.region.provinceName}`;
  const lines: string[] = [];

  // Region header.
  lines.push(
    isEn
      ? `Region: ${region} (lat ${s.region.lat.toFixed(4)}, lon ${s.region.lon.toFixed(4)}).`
      : `Wilayah: ${region} (lat ${s.region.lat.toFixed(4)}, lon ${s.region.lon.toFixed(4)}).`,
  );

  // Current weather.
  if (now) {
    lines.push(
      isEn
        ? `Current weather (${now.datetime}): ${now.weather_desc}, temperature ${now.t}°C, humidity ${now.hu}%, ` +
            `wind ${now.ws} km/h from ${now.wd}, cloud cover ${now.tcc}%, visibility ${now.vs_text}.`
        : `Cuaca terkini (${now.datetime}): ${now.weather_desc}, suhu ${now.t}°C, kelembapan ${now.hu}%, ` +
            `angin ${now.ws} km/jam dari ${now.wd}, tutupan awan ${now.tcc}%, jarak pandang ${now.vs_text}.`,
    );
  } else {
    lines.push(
      isEn
        ? "BMKG weather data is not available for this region right now."
        : "Data cuaca BMKG tidak tersedia untuk wilayah ini saat ini.",
    );
  }

  // 3-day forecast.
  if (s.forecast.length > 0) {
    const items = s.forecast
      .map((f) => `${f.dayLabel} ${f.tMin}–${f.tMax}°C ${f.sample.weather_desc}`)
      .join("; ");
    lines.push(isEn ? `3-day forecast: ${items}` : `Prakiraan 3 hari: ${items}`);
  }

  // Air quality.
  if (s.airQuality) {
    const band = pm25Band(s.airQuality.pm2_5);
    const label = pm25BandLabel(band.tone, locale);
    lines.push(
      isEn
        ? `Air quality: PM2.5 ${formatNum(s.airQuality.pm2_5)} µg/m³ (${label}), ` +
            `PM10 ${formatNum(s.airQuality.pm10)} µg/m³, NO2 ${formatNum(s.airQuality.no2)} µg/m³, ` +
            `O3 ${formatNum(s.airQuality.o3)} µg/m³.`
        : `Kualitas udara: PM2.5 ${formatNum(s.airQuality.pm2_5)} µg/m³ (${label}), ` +
            `PM10 ${formatNum(s.airQuality.pm10)} µg/m³, NO2 ${formatNum(s.airQuality.no2)} µg/m³, ` +
            `O3 ${formatNum(s.airQuality.o3)} µg/m³.`,
    );
  } else {
    lines.push(
      isEn
        ? "Open-Meteo air quality data is not available."
        : "Data kualitas udara Open-Meteo tidak tersedia.",
    );
  }

  // Latest earthquake.
  if (s.earthquake) {
    lines.push(
      isEn
        ? `Latest earthquake: M${s.earthquake.magnitude} at ${s.earthquake.wilayah}, ` +
            `depth ${s.earthquake.kedalaman}, on ${s.earthquake.tanggal} ${s.earthquake.jam} ` +
            `(tsunami potential: ${s.earthquake.potensi}).`
        : `Gempa terbaru: M${s.earthquake.magnitude} di ${s.earthquake.wilayah}, ` +
            `kedalaman ${s.earthquake.kedalaman}, pada ${s.earthquake.tanggal} ${s.earthquake.jam} ` +
            `(potensi: ${s.earthquake.potensi}).`,
    );
  }

  // Active warnings.
  if (s.warnings.length > 0) {
    const joined = s.warnings.map((w) => `${w.headline} — ${w.description}`).join(" | ");
    lines.push(isEn ? `Active warnings: ${joined}` : `Peringatan aktif: ${joined}`);
  }

  return lines.join("\n");
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return n.toFixed(1);
}
