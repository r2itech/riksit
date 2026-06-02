// Deterministic rule-based insight used when every AI provider in the chain
// (lib/ai/index.ts) has failed or has no API key. Same structured-markdown
// contract as `SYSTEM_PROMPT` (lib/ai/prompt.ts) so the rendered card looks
// consistent regardless of source.
import type { EnvironmentalSnapshot } from "../types";
import { pm25Band } from "../open-meteo";

export function buildFallback(s: EnvironmentalSnapshot): string {
  const now = s.weather?.samples[0];
  const region = `${s.region.districtName}, ${s.region.regencyName}`;
  const band = pm25Band(s.airQuality?.pm2_5 ?? null);
  const risks: string[] = [];
  const recs: string[] = [];

  if (now) {
    if (now.t >= 33)
      risks.push(`Suhu cukup tinggi (**${now.t}°C**) — risiko *dehidrasi* meningkat.`);
    if (now.hu >= 85) risks.push(`Kelembapan tinggi (**${now.hu}%**) — kenyamanan termal menurun.`);
    if (/hujan|petir|badai/i.test(now.weather_desc))
      risks.push(`Potensi **${now.weather_desc.toLowerCase()}** di wilayah ${region}.`);
    if (now.ws >= 25) risks.push(`Angin kencang (**${now.ws} km/jam**).`);
  }
  if (s.airQuality?.pm2_5 != null && s.airQuality.pm2_5 > 35) {
    risks.push(
      `Kualitas udara **${band.label}** (PM2.5 *${s.airQuality.pm2_5.toFixed(1)} µg/m³*).`,
    );
    recs.push(
      "Gunakan **masker** saat beraktivitas di luar ruangan, terutama untuk kelompok rentan.",
    );
  } else if (s.airQuality?.pm2_5 != null) {
    recs.push(`Kualitas udara **${band.label}** — aman untuk aktivitas luar ruangan normal.`);
  }
  if (s.earthquake) {
    const mag = parseFloat(s.earthquake.magnitude);
    if (Number.isFinite(mag) && mag >= 5) {
      risks.push(
        `Gempa **M${s.earthquake.magnitude}** terdeteksi di ${s.earthquake.wilayah} (potensi: ${s.earthquake.potensi}).`,
      );
    }
  }
  if (s.warnings.length > 0) {
    for (const w of s.warnings) risks.push(`Peringatan: **${w.headline}**.`);
    recs.push("Pantau kanal informasi resmi **BMKG** dan **BPBD** setempat.");
  }
  if (recs.length === 0) {
    recs.push(
      "Lanjutkan aktivitas seperti biasa dengan tetap menjaga **hidrasi** dan **perlindungan UV**.",
    );
  }
  if (risks.length === 0) risks.push("Tidak ada risiko signifikan yang terdeteksi.");

  const summaryParts: string[] = [];
  if (now) {
    summaryParts.push(
      `Kondisi di **${region}** saat ini *${now.weather_desc.toLowerCase()}* dengan suhu *${now.t}°C* dan kelembapan *${now.hu}%*.`,
    );
  } else {
    summaryParts.push(`Ringkasan kondisi lingkungan untuk **${region}**.`);
  }
  if (s.airQuality?.pm2_5 != null) {
    summaryParts.push(
      `Kualitas udara berada pada level *${band.label}* (PM2.5 *${s.airQuality.pm2_5.toFixed(1)} µg/m³*).`,
    );
  }

  return [
    `## Ringkasan Kondisi`,
    summaryParts.join(" "),
    ``,
    `## Potensi Risiko`,
    ...risks.map((r) => `- ${r}`),
    ``,
    `## Rekomendasi`,
    ...recs.map((r) => `- ${r}`),
  ].join("\n");
}
