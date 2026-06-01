// Server-only Gemini client. Imported only from API route handlers, so it never
// reaches the browser bundle. Falls back to a deterministic offline insight
// when the API key is missing or the upstream call fails — keeping the app
// useful in any environment.
import type { EnvironmentalSnapshot, InsightPayload } from "./types";
import { pm25Band } from "./open-meteo";

// Gemini free-tier quotas are PER-MODEL, so on 429 we try the next model in
// the chain before giving up to the deterministic fallback. Order is
// best-quality → cheapest.
const MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"] as const;

const REQUEST_TIMEOUT_MS = 18_000;

function sanitizeKey(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

const SYSTEM_PROMPT = `Anda adalah RIKSIT, asisten kecerdasan lingkungan untuk Indonesia.
Berikan jawaban dalam Bahasa Indonesia yang ringkas, akurat, dan actionable.
Selalu kembalikan struktur Markdown berikut—tanpa awalan apa pun:

## Ringkasan Kondisi
Paragraf singkat 2-3 kalimat tentang kondisi lingkungan saat ini.

## Potensi Risiko
Daftar poin (-) berisi risiko atau anomali yang terdeteksi. Jika tidak ada, tulis "- Tidak ada risiko signifikan yang terdeteksi."

## Rekomendasi
Daftar poin (-) berisi tindakan praktis untuk warga di wilayah ini.
Gunakan **tebal** untuk istilah penting dan *miring* untuk angka kunci.`;

function summarizeSnapshot(s: EnvironmentalSnapshot): string {
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

type ModelCallResult =
  | { ok: true; text: string }
  | { ok: false; retryable: boolean; status?: number };

async function callModel(model: string, key: string, body: unknown): Promise<ModelCallResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), REQUEST_TIMEOUT_MS);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`[gemini] ${model} → ${res.status}`, errBody.slice(0, 200));
      // 401/403 → bad key; no other model will help, stop the chain.
      // 400 → bad request; same prompt won't work on any other model either.
      // 429 → quota; another model has its own quota, try next.
      // 5xx / network → transient; try next as defence in depth.
      const retryable = res.status === 429 || res.status === 408 || res.status >= 500;
      return { ok: false, retryable, status: res.status };
    }
    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) return { ok: false, retryable: true };
    return { ok: true, text };
  } catch (err) {
    console.warn(`[gemini] ${model} request error`, err);
    // Network/abort errors are transient → try next model.
    return { ok: false, retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateInsight(snapshot: EnvironmentalSnapshot): Promise<InsightPayload> {
  const key = sanitizeKey(process.env.GEMINI_API_KEY);
  const context = summarizeSnapshot(snapshot);
  const generatedAt = new Date().toISOString();

  if (!key) {
    return { generatedAt, text: buildFallback(snapshot), source: "fallback" };
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `${SYSTEM_PROMPT}\n\nData lingkungan saat ini:\n${context}\n\n` +
              `Berdasarkan data di atas, susun wawasan lingkungan untuk warga setempat.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 800,
      topP: 0.9,
    },
  };

  for (const model of MODEL_CHAIN) {
    const result = await callModel(model, key, body);
    if (result.ok) {
      return { generatedAt, text: result.text, source: "gemini" };
    }
    if (!result.retryable) break;
  }

  return { generatedAt, text: buildFallback(snapshot), source: "fallback" };
}

/** Deterministic fallback insight constructed from the snapshot. */
function buildFallback(s: EnvironmentalSnapshot): string {
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
