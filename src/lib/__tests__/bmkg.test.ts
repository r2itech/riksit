import { describe, expect, it } from "vitest";
import { buildForecast, getEarlyWarnings } from "@/lib/bmkg";
import type { BmkgWeather, WeatherSample } from "@/lib/types";

function sample(over: Partial<WeatherSample> = {}): WeatherSample {
  return {
    datetime: "2026-06-01 12:00:00",
    utc_datetime: "2026-06-01 05:00:00",
    t: 28,
    hu: 70,
    ws: 3,
    wd: "N",
    tcc: 50,
    vs_text: "> 10 km",
    weather: 1,
    weather_desc: "Cerah",
    ...over,
  };
}

function weather(samples: WeatherSample[]): BmkgWeather {
  return {
    location: {
      provinsi: "Jawa Barat",
      kotkab: "Majalengka",
      kecamatan: "Lemahsugih",
      desa: "Bangbayang",
      lon: 108.2028847906,
      lat: -7.034916775,
      timezone: "Asia/Jakarta",
    },
    samples,
  };
}

describe("buildForecast", () => {
  it("returns [] for null weather", () => {
    expect(buildForecast(null)).toEqual([]);
  });

  it("returns [] when there are no samples", () => {
    expect(buildForecast(weather([]))).toEqual([]);
  });

  it("groups samples by date", () => {
    const w = weather([
      sample({ datetime: "2026-06-01 06:00:00", t: 22 }),
      sample({ datetime: "2026-06-01 12:00:00", t: 30 }),
      sample({ datetime: "2026-06-01 18:00:00", t: 26 }),
      sample({ datetime: "2026-06-02 12:00:00", t: 31 }),
    ]);
    const out = buildForecast(w, 3);
    expect(out.length).toBe(2);
    expect(out[0].date).toBe("2026-06-01");
    expect(out[1].date).toBe("2026-06-02");
  });

  it("computes min/max temperature per day", () => {
    const w = weather([
      sample({ datetime: "2026-06-01 06:00:00", t: 22 }),
      sample({ datetime: "2026-06-01 12:00:00", t: 30 }),
      sample({ datetime: "2026-06-01 18:00:00", t: 26 }),
    ]);
    const out = buildForecast(w, 3);
    expect(out[0].tMin).toBe(22);
    expect(out[0].tMax).toBe(30);
  });

  it("picks the sample closest to midday as the representative", () => {
    const midday = sample({
      datetime: "2026-06-01 12:00:00",
      t: 30,
      weather_desc: "Cerah",
    });
    const w = weather([
      sample({ datetime: "2026-06-01 06:00:00", t: 22, weather_desc: "Berawan" }),
      midday,
      sample({ datetime: "2026-06-01 21:00:00", t: 25, weather_desc: "Hujan" }),
    ]);
    const out = buildForecast(w, 3);
    expect(out[0].sample.datetime).toBe(midday.datetime);
    expect(out[0].sample.weather_desc).toBe("Cerah");
  });

  it("respects the days parameter", () => {
    const w = weather([
      sample({ datetime: "2026-06-01 12:00:00" }),
      sample({ datetime: "2026-06-02 12:00:00" }),
      sample({ datetime: "2026-06-03 12:00:00" }),
      sample({ datetime: "2026-06-04 12:00:00" }),
    ]);
    expect(buildForecast(w, 2).length).toBe(2);
    expect(buildForecast(w, 5).length).toBe(4);
  });
});

describe("getEarlyWarnings", () => {
  it("returns [] when weather is null", async () => {
    expect(await getEarlyWarnings(null)).toEqual([]);
  });

  it("returns [] when no severe weather codes today", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const w = weather([
      sample({ datetime: `${today} 12:00:00`, weather: 1, weather_desc: "Cerah" }),
    ]);
    expect(await getEarlyWarnings(w)).toEqual([]);
  });

  it("returns a warning when a severe weather code is flagged today", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const w = weather([
      sample({
        datetime: `${today} 15:00:00`,
        weather: 95, // thunderstorm
        weather_desc: "Hujan Petir",
      }),
    ]);
    const warnings = await getEarlyWarnings(w);
    expect(warnings.length).toBe(1);
    expect(warnings[0].headline).toMatch(/Majalengka/);
    expect(warnings[0].description).toContain("Hujan Petir");
    expect(warnings[0].severity).toBe("moderate");
  });

  it("ignores severe codes on other days", async () => {
    const w = weather([
      sample({
        datetime: "1999-01-01 12:00:00", // not today
        weather: 95,
        weather_desc: "Hujan Petir",
      }),
    ]);
    expect(await getEarlyWarnings(w)).toEqual([]);
  });
});
