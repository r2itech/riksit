import { describe, expect, it } from "vitest";
import { findRegencyByName, normalizeName } from "@/lib/region-api";

describe("normalizeName", () => {
  it("lowercases the input", () => {
    expect(normalizeName("Majalengka")).toBe("majalengka");
  });

  it("strips the kabupaten prefix", () => {
    expect(normalizeName("Kabupaten Bogor")).toBe("bogor");
  });

  it("strips the kota prefix", () => {
    expect(normalizeName("Kota Bandung")).toBe("bandung");
  });

  it("strips kota administrasi (multi-word) prefix", () => {
    expect(normalizeName("Kota Administrasi Jakarta Pusat")).toBe("jakarta pusat");
  });

  it("strips DKI prefix", () => {
    expect(normalizeName("DKI Jakarta")).toBe("jakarta");
  });

  it("matches Jakarta in both wilayah.id and Nominatim forms", () => {
    expect(normalizeName("DKI Jakarta")).toBe(normalizeName("Daerah Khusus Ibukota Jakarta"));
  });

  it("strips daerah istimewa", () => {
    expect(normalizeName("Daerah Istimewa Yogyakarta")).toBe("yogyakarta");
  });

  it("collapses whitespace", () => {
    expect(normalizeName("  Kota   Bandung  ")).toBe("bandung");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeName("")).toBe("");
  });

  it("returns empty string when the input is entirely prefix words", () => {
    expect(normalizeName("kabupaten kota")).toBe("");
  });
});

describe("findRegencyByName", () => {
  const list = [
    { code: "32.01", name: "Kabupaten Bogor" },
    { code: "32.04", name: "Kabupaten Bandung" },
    { code: "32.10", name: "Kabupaten Majalengka" },
    { code: "31.71", name: "Kota Administrasi Jakarta Pusat" },
  ];

  it("matches by normalized exact name", () => {
    expect(findRegencyByName(list, "Majalengka")?.code).toBe("32.10");
  });

  it("matches case-insensitively", () => {
    expect(findRegencyByName(list, "majalengka")?.code).toBe("32.10");
  });

  it("matches with the kabupaten prefix supplied", () => {
    expect(findRegencyByName(list, "Kabupaten Majalengka")?.code).toBe("32.10");
  });

  it("matches Nominatim's 'Jakarta Pusat' to wilayah.id 'Kota Administrasi Jakarta Pusat'", () => {
    expect(findRegencyByName(list, "Jakarta Pusat")?.code).toBe("31.71");
  });

  it("returns undefined for no match", () => {
    expect(findRegencyByName(list, "Atlantis")).toBeUndefined();
  });

  it("returns undefined for empty target", () => {
    expect(findRegencyByName(list, "")).toBeUndefined();
  });
});
