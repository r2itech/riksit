import { describe, expect, it } from "vitest";
import { pm25Band } from "@/lib/open-meteo";

describe("pm25Band", () => {
  it("classifies 0–12 µg/m³ as Baik", () => {
    expect(pm25Band(0).tone).toBe("good");
    expect(pm25Band(0).label).toBe("Baik");
    expect(pm25Band(12).tone).toBe("good");
  });

  it("classifies >12 to 35.4 as Sedang", () => {
    expect(pm25Band(12.1).tone).toBe("moderate");
    expect(pm25Band(35.4).tone).toBe("moderate");
    expect(pm25Band(35.4).label).toBe("Sedang");
  });

  it("classifies >35.4 to 55.4 as Tidak Sehat", () => {
    expect(pm25Band(35.5).tone).toBe("unhealthy");
    expect(pm25Band(55.4).tone).toBe("unhealthy");
    expect(pm25Band(55.4).label).toBe("Tidak Sehat");
  });

  it("classifies >55.4 to 150.4 as Sangat Tidak Sehat", () => {
    expect(pm25Band(55.5).tone).toBe("veryUnhealthy");
    expect(pm25Band(150.4).tone).toBe("veryUnhealthy");
    expect(pm25Band(150.4).label).toBe("Sangat Tidak Sehat");
  });

  it("classifies >150.4 as Berbahaya", () => {
    expect(pm25Band(150.5).tone).toBe("hazardous");
    expect(pm25Band(500).tone).toBe("hazardous");
    expect(pm25Band(500).label).toBe("Berbahaya");
  });

  it("returns unknown for null", () => {
    expect(pm25Band(null).tone).toBe("unknown");
    expect(pm25Band(null).label).toBe("Tidak Tersedia");
  });

  it("returns unknown for NaN", () => {
    expect(pm25Band(Number.NaN).tone).toBe("unknown");
  });

  it("returns unknown for Infinity", () => {
    expect(pm25Band(Number.POSITIVE_INFINITY).tone).toBe("unknown");
  });
});
