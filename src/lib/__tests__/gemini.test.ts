import { describe, expect, it } from "vitest";
import { buildFallback } from "@/lib/gemini";
import type { EnvironmentalSnapshot, WeatherSample } from "@/lib/types";

function makeSnapshot(over: Partial<EnvironmentalSnapshot> = {}): EnvironmentalSnapshot {
  const sample: WeatherSample = {
    datetime: "2026-06-01 12:00:00",
    utc_datetime: "2026-06-01 05:00:00",
    t: 28,
    hu: 70,
    ws: 4,
    wd: "N",
    tcc: 30,
    vs_text: "> 10 km",
    weather: 1,
    weather_desc: "Cerah",
  };
  return {
    region: {
      provinceName: "Jawa Barat",
      regencyName: "Majalengka",
      districtName: "Majalengka",
      villageName: "Majalengka Kulon",
      lat: -6.83,
      lon: 108.21,
    },
    weather: {
      location: {
        provinsi: "Jawa Barat",
        kotkab: "Majalengka",
        kecamatan: "Majalengka",
        desa: "Majalengka Kulon",
        lon: 108.21,
        lat: -6.83,
        timezone: "Asia/Jakarta",
      },
      samples: [sample],
    },
    forecast: [],
    airQuality: { pm2_5: 8, pm10: 14, no2: 5, o3: 70, time: null },
    earthquake: null,
    warnings: [],
    ...over,
  };
}

describe("buildFallback", () => {
  it("renders the three required headings", () => {
    const md = buildFallback(makeSnapshot());
    expect(md).toContain("## Ringkasan Kondisi");
    expect(md).toContain("## Potensi Risiko");
    expect(md).toContain("## Rekomendasi");
  });

  it("flags high temperature as a risk", () => {
    const md = buildFallback(
      makeSnapshot({
        weather: {
          location: makeSnapshot().weather!.location,
          samples: [
            {
              ...makeSnapshot().weather!.samples[0],
              t: 35,
            },
          ],
        },
      }),
    );
    expect(md).toMatch(/Suhu cukup tinggi/i);
    expect(md).toContain("35°C");
  });

  it("flags high humidity as a risk", () => {
    const md = buildFallback(
      makeSnapshot({
        weather: {
          location: makeSnapshot().weather!.location,
          samples: [
            {
              ...makeSnapshot().weather!.samples[0],
              hu: 90,
            },
          ],
        },
      }),
    );
    expect(md).toMatch(/Kelembapan tinggi/i);
  });

  it("flags severe weather descriptions", () => {
    const md = buildFallback(
      makeSnapshot({
        weather: {
          location: makeSnapshot().weather!.location,
          samples: [
            {
              ...makeSnapshot().weather!.samples[0],
              weather_desc: "Hujan Petir",
            },
          ],
        },
      }),
    );
    expect(md).toMatch(/hujan petir/i);
  });

  it("flags unhealthy PM2.5 and recommends a mask", () => {
    const md = buildFallback(
      makeSnapshot({
        airQuality: { pm2_5: 60, pm10: 70, no2: 10, o3: 40, time: null },
      }),
    );
    expect(md).toMatch(/Tidak Sehat/);
    expect(md).toMatch(/masker/i);
  });

  it("flags significant earthquakes (M ≥ 5)", () => {
    const md = buildFallback(
      makeSnapshot({
        earthquake: {
          tanggal: "01 Jun 2026",
          jam: "04:30:07 WIB",
          datetime: "2026-06-01T04:30:07",
          coordinates: "-8.89,117.64",
          lintang: "8.89 LS",
          bujur: "117.64 BT",
          magnitude: "5.4",
          kedalaman: "10 km",
          wilayah: "Tenggara Sumbawa",
          potensi: "Tidak berpotensi tsunami",
        },
      }),
    );
    expect(md).toMatch(/Gempa.*M5\.4/);
    expect(md).toMatch(/Tenggara Sumbawa/);
  });

  it("does NOT flag minor earthquakes (M < 5)", () => {
    const md = buildFallback(
      makeSnapshot({
        earthquake: {
          tanggal: "01 Jun 2026",
          jam: "04:30:07 WIB",
          datetime: "2026-06-01T04:30:07",
          coordinates: "-8.89,117.64",
          lintang: "8.89 LS",
          bujur: "117.64 BT",
          magnitude: "3.9",
          kedalaman: "10 km",
          wilayah: "Tenggara Sumbawa",
          potensi: "Tidak berpotensi tsunami",
        },
      }),
    );
    expect(md).not.toMatch(/Gempa.*M3\.9/);
  });

  it("falls through to the 'no risk' line when nothing is alarming", () => {
    const md = buildFallback(makeSnapshot());
    expect(md).toMatch(/Tidak ada risiko signifikan/);
  });

  it("always includes at least one recommendation", () => {
    const md = buildFallback(makeSnapshot());
    const recIdx = md.indexOf("## Rekomendasi");
    const recBody = md.slice(recIdx);
    expect(recBody.match(/^- /m)).not.toBeNull();
  });

  it("handles missing weather data gracefully", () => {
    const md = buildFallback(
      makeSnapshot({
        weather: null,
      }),
    );
    expect(md).toContain("## Ringkasan Kondisi");
    expect(md).toContain("## Potensi Risiko");
    expect(md).toContain("## Rekomendasi");
  });

  it("handles missing air quality data gracefully", () => {
    const md = buildFallback(makeSnapshot({ airQuality: null }));
    expect(md).toContain("## Ringkasan Kondisi");
  });
});
