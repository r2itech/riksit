// Shared prompt scaffolding for every AI provider. Bahasa-Indonesia output
// contract — the structured-markdown layout the deterministic fallback
// (lib/ai/fallback.ts) also follows so the rendered card looks consistent
// across all sources.
import type { EnvironmentalSnapshot } from "../types";
import { pm25Band } from "../open-meteo";

export const SYSTEM_PROMPT = `Anda adalah RIKSIT, asisten kecerdasan lingkungan untuk Indonesia.
Berikan jawaban dalam Bahasa Indonesia yang ringkas, akurat, dan actionable.
Selalu kembalikan struktur Markdown berikut—tanpa awalan apa pun:

## Ringkasan Kondisi
Paragraf singkat 2-3 kalimat tentang kondisi lingkungan saat ini.

## Potensi Risiko
Daftar poin (-) berisi risiko atau anomali yang terdeteksi. Jika tidak ada, tulis "- Tidak ada risiko signifikan yang terdeteksi."

## Rekomendasi
Daftar poin (-) berisi tindakan praktis untuk warga di wilayah ini.
Gunakan **tebal** untuk istilah penting dan *miring* untuk angka kunci.`;

export function summarizeSnapshot(s: EnvironmentalSnapshot): string {
  const now = s.weather?.samples[0];
  const region = `${s.region.districtName}, ${s.region.regencyName}, ${s.region.provinceName}`;
  const lines: string[] = [
    `Wilayah: ${region} (lat ${s.region.lat.toFixed(4)}, lon ${s.region.lon.toFixed(4)}).`,
  ];
  if (now) {
    lines.push(
      `Cuaca terkini (${now.datetime}): ${now.weather_desc}, suhu ${now.t}°C, kelembapan ${now.hu}%, ` +
        `angin ${now.ws} km/jam dari ${now.wd}, tutupan awan ${now.tcc}%, jarak pandang ${now.vs_text}.`,
    );
  } else {
    lines.push("Data cuaca BMKG tidak tersedia untuk wilayah ini saat ini.");
  }
  if (s.forecast.length > 0) {
    lines.push(
      "Prakiraan 3 hari: " +
        s.forecast
          .map((f) => `${f.dayLabel} ${f.tMin}–${f.tMax}°C ${f.sample.weather_desc}`)
          .join("; "),
    );
  }
  if (s.airQuality) {
    const band = pm25Band(s.airQuality.pm2_5);
    lines.push(
      `Kualitas udara: PM2.5 ${formatNum(s.airQuality.pm2_5)} µg/m³ (${band.label}), ` +
        `PM10 ${formatNum(s.airQuality.pm10)} µg/m³, NO2 ${formatNum(s.airQuality.no2)} µg/m³, ` +
        `O3 ${formatNum(s.airQuality.o3)} µg/m³.`,
    );
  } else {
    lines.push("Data kualitas udara Open-Meteo tidak tersedia.");
  }
  if (s.earthquake) {
    lines.push(
      `Gempa terbaru: M${s.earthquake.magnitude} di ${s.earthquake.wilayah}, ` +
        `kedalaman ${s.earthquake.kedalaman}, pada ${s.earthquake.tanggal} ${s.earthquake.jam} ` +
        `(potensi: ${s.earthquake.potensi}).`,
    );
  }
  if (s.warnings.length > 0) {
    lines.push(
      "Peringatan aktif: " + s.warnings.map((w) => `${w.headline} — ${w.description}`).join(" | "),
    );
  }
  return lines.join("\n");
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return n.toFixed(1);
}
