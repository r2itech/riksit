// Deterministic rule-based insight used when every AI provider in the chain
// (lib/ai/index.ts) has failed or has no API key. Same structured-markdown
// contract as `getSystemPrompt` (lib/ai/prompt.ts) so the rendered card looks
// consistent regardless of source. Locale-aware so the output matches the
// language the user selected.
import type { EnvironmentalSnapshot } from "../types";
import type { Locale } from "../i18n";
import { pm25Band, pm25BandLabel } from "../open-meteo";

interface Strings {
  headingSummary: string;
  headingRisks: string;
  headingRecs: string;
  noRisk: string;
  defaultRec: string;
  conditionLine: (region: string, desc: string, t: number, hu: number) => string;
  conditionLineNoWeather: (region: string) => string;
  airQualityLine: (label: string, pm: number) => string;
  highTemp: (t: number) => string;
  highHumidity: (hu: number) => string;
  severe: (desc: string, region: string) => string;
  strongWind: (ws: number) => string;
  poorAir: (label: string, pm: number) => string;
  poorAirRec: string;
  safeAir: (label: string) => string;
  earthquake: (m: string, region: string, potency: string) => string;
  warningPrefix: (headline: string) => string;
  warningRec: string;
}

const STRINGS_ID: Strings = {
  headingSummary: "## Ringkasan Kondisi",
  headingRisks: "## Potensi Risiko",
  headingRecs: "## Rekomendasi",
  noRisk: "Tidak ada risiko signifikan yang terdeteksi.",
  defaultRec:
    "Lanjutkan aktivitas seperti biasa dengan tetap menjaga **hidrasi** dan **perlindungan UV**.",
  conditionLine: (region, desc, t, hu) =>
    `Kondisi di **${region}** saat ini *${desc.toLowerCase()}* dengan suhu *${t}°C* dan kelembapan *${hu}%*.`,
  conditionLineNoWeather: (region) => `Ringkasan kondisi lingkungan untuk **${region}**.`,
  airQualityLine: (label, pm) =>
    `Kualitas udara berada pada level *${label}* (PM2.5 *${pm.toFixed(1)} µg/m³*).`,
  highTemp: (t) => `Suhu cukup tinggi (**${t}°C**) — risiko *dehidrasi* meningkat.`,
  highHumidity: (hu) => `Kelembapan tinggi (**${hu}%**) — kenyamanan termal menurun.`,
  severe: (desc, region) => `Potensi **${desc.toLowerCase()}** di wilayah ${region}.`,
  strongWind: (ws) => `Angin kencang (**${ws} km/jam**).`,
  poorAir: (label, pm) => `Kualitas udara **${label}** (PM2.5 *${pm.toFixed(1)} µg/m³*).`,
  poorAirRec:
    "Gunakan **masker** saat beraktivitas di luar ruangan, terutama untuk kelompok rentan.",
  safeAir: (label) => `Kualitas udara **${label}** — aman untuk aktivitas luar ruangan normal.`,
  earthquake: (m, region, potency) =>
    `Gempa **M${m}** terdeteksi di ${region} (potensi: ${potency}).`,
  warningPrefix: (headline) => `Peringatan: **${headline}**.`,
  warningRec: "Pantau kanal informasi resmi **BMKG** dan **BPBD** setempat.",
};

const STRINGS_EN: Strings = {
  headingSummary: "## Current Conditions",
  headingRisks: "## Potential Risks",
  headingRecs: "## Recommendations",
  noRisk: "No significant risks detected.",
  defaultRec:
    "Carry on with normal activities while maintaining **hydration** and **UV protection**.",
  conditionLine: (region, desc, t, hu) =>
    `Conditions in **${region}** are currently *${desc.toLowerCase()}* with temperature *${t}°C* and humidity *${hu}%*.`,
  conditionLineNoWeather: (region) => `Environmental summary for **${region}**.`,
  airQualityLine: (label, pm) => `Air quality is *${label}* (PM2.5 *${pm.toFixed(1)} µg/m³*).`,
  highTemp: (t) => `Temperature is high (**${t}°C**) — risk of *dehydration* increases.`,
  highHumidity: (hu) => `Humidity is high (**${hu}%**) — thermal comfort is reduced.`,
  severe: (desc, region) => `Potential **${desc.toLowerCase()}** in ${region}.`,
  strongWind: (ws) => `Strong wind (**${ws} km/h**).`,
  poorAir: (label, pm) => `Air quality **${label}** (PM2.5 *${pm.toFixed(1)} µg/m³*).`,
  poorAirRec: "Wear a **mask** when outdoors, especially for vulnerable groups.",
  safeAir: (label) => `Air quality **${label}** — safe for normal outdoor activity.`,
  earthquake: (m, region, potency) =>
    `Earthquake **M${m}** detected at ${region} (tsunami potential: ${potency}).`,
  warningPrefix: (headline) => `Warning: **${headline}**.`,
  warningRec: "Monitor official channels of **BMKG** and local **BPBD**.",
};

function stringsFor(locale: Locale): Strings {
  return locale === "en-US" ? STRINGS_EN : STRINGS_ID;
}

export function buildFallback(s: EnvironmentalSnapshot, locale: Locale): string {
  const L = stringsFor(locale);
  const now = s.weather?.samples[0];
  const region = `${s.region.districtName}, ${s.region.regencyName}`;
  const band = pm25Band(s.airQuality?.pm2_5 ?? null);
  const bandLabel = pm25BandLabel(band.tone, locale);
  const risks: string[] = [];
  const recs: string[] = [];

  if (now) {
    if (now.t >= 33) risks.push(L.highTemp(now.t));
    if (now.hu >= 85) risks.push(L.highHumidity(now.hu));
    if (/hujan|petir|badai|rain|storm|thunder/i.test(now.weather_desc))
      risks.push(L.severe(now.weather_desc, region));
    if (now.ws >= 25) risks.push(L.strongWind(now.ws));
  }
  if (s.airQuality?.pm2_5 != null && s.airQuality.pm2_5 > 35) {
    risks.push(L.poorAir(bandLabel, s.airQuality.pm2_5));
    recs.push(L.poorAirRec);
  } else if (s.airQuality?.pm2_5 != null) {
    recs.push(L.safeAir(bandLabel));
  }
  if (s.earthquake) {
    const mag = parseFloat(s.earthquake.magnitude);
    if (Number.isFinite(mag) && mag >= 5) {
      risks.push(L.earthquake(s.earthquake.magnitude, s.earthquake.wilayah, s.earthquake.potensi));
    }
  }
  if (s.warnings.length > 0) {
    for (const w of s.warnings) risks.push(L.warningPrefix(w.headline));
    recs.push(L.warningRec);
  }
  if (recs.length === 0) recs.push(L.defaultRec);
  if (risks.length === 0) risks.push(L.noRisk);

  const summaryParts: string[] = [];
  if (now) {
    summaryParts.push(L.conditionLine(region, now.weather_desc, now.t, now.hu));
  } else {
    summaryParts.push(L.conditionLineNoWeather(region));
  }
  if (s.airQuality?.pm2_5 != null) {
    summaryParts.push(L.airQualityLine(bandLabel, s.airQuality.pm2_5));
  }

  return [
    L.headingSummary,
    summaryParts.join(" "),
    ``,
    L.headingRisks,
    ...risks.map((r) => `- ${r}`),
    ``,
    L.headingRecs,
    ...recs.map((r) => `- ${r}`),
  ].join("\n");
}
