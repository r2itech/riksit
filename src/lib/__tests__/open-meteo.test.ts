import { describe, expect, it } from "vitest";
import { pm25Band, pm25BandLabel } from "@/lib/open-meteo";

describe("pm25Band — tone thresholds", () => {
  it("classifies 0–12 µg/m³ as good", () => {
    expect(pm25Band(0).tone).toBe("good");
    expect(pm25Band(12).tone).toBe("good");
  });

  it("classifies >12 to 35.4 as moderate", () => {
    expect(pm25Band(12.1).tone).toBe("moderate");
    expect(pm25Band(35.4).tone).toBe("moderate");
  });

  it("classifies >35.4 to 55.4 as unhealthy", () => {
    expect(pm25Band(35.5).tone).toBe("unhealthy");
    expect(pm25Band(55.4).tone).toBe("unhealthy");
  });

  it("classifies >55.4 to 150.4 as veryUnhealthy", () => {
    expect(pm25Band(55.5).tone).toBe("veryUnhealthy");
    expect(pm25Band(150.4).tone).toBe("veryUnhealthy");
  });

  it("classifies >150.4 as hazardous", () => {
    expect(pm25Band(150.5).tone).toBe("hazardous");
    expect(pm25Band(500).tone).toBe("hazardous");
  });

  it("returns unknown for null", () => {
    expect(pm25Band(null).tone).toBe("unknown");
  });

  it("returns unknown for NaN", () => {
    expect(pm25Band(Number.NaN).tone).toBe("unknown");
  });

  it("returns unknown for Infinity", () => {
    expect(pm25Band(Number.POSITIVE_INFINITY).tone).toBe("unknown");
  });
});

describe("pm25BandLabel — localized labels", () => {
  it("returns Indonesian labels for id-ID", () => {
    expect(pm25BandLabel("good", "id-ID")).toBe("Baik");
    expect(pm25BandLabel("moderate", "id-ID")).toBe("Sedang");
    expect(pm25BandLabel("unhealthy", "id-ID")).toBe("Tidak Sehat");
    expect(pm25BandLabel("veryUnhealthy", "id-ID")).toBe("Sangat Tidak Sehat");
    expect(pm25BandLabel("hazardous", "id-ID")).toBe("Berbahaya");
    expect(pm25BandLabel("unknown", "id-ID")).toBe("Tidak Tersedia");
  });

  it("returns English labels for en-US", () => {
    expect(pm25BandLabel("good", "en-US")).toBe("Good");
    expect(pm25BandLabel("moderate", "en-US")).toBe("Moderate");
    expect(pm25BandLabel("unhealthy", "en-US")).toBe("Unhealthy");
    expect(pm25BandLabel("veryUnhealthy", "en-US")).toBe("Very Unhealthy");
    expect(pm25BandLabel("hazardous", "en-US")).toBe("Hazardous");
    expect(pm25BandLabel("unknown", "en-US")).toBe("Not Available");
  });
});
