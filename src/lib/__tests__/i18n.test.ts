import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, htmlLang, isLocale, LOCALES, translate } from "@/lib/i18n";

describe("i18n — locale catalog", () => {
  it("declares id-ID and en-US as the supported locales", () => {
    expect(LOCALES).toEqual(["id-ID", "en-US"]);
  });

  it("uses id-ID as the default locale", () => {
    expect(DEFAULT_LOCALE).toBe("id-ID");
  });

  it("isLocale narrows correctly", () => {
    expect(isLocale("id-ID")).toBe(true);
    expect(isLocale("en-US")).toBe(true);
    expect(isLocale("")).toBe(false);
    expect(isLocale("fr-FR")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("htmlLang maps to a short BCP-47 lang code", () => {
    expect(htmlLang("id-ID")).toBe("id");
    expect(htmlLang("en-US")).toBe("en");
  });
});

describe("translate — lookup + interpolation", () => {
  it("looks up the requested locale", () => {
    expect(translate("id-ID", "disclaimer.ack")).toBe("Saya Mengerti");
    expect(translate("en-US", "disclaimer.ack")).toBe("I Understand");
  });

  it("interpolates {var} placeholders", () => {
    expect(
      translate("id-ID", "region.detected", { regency: "Majalengka", province: "Jawa Barat" }),
    ).toBe("Lokasi terdeteksi: Majalengka, Jawa Barat.");
    expect(
      translate("en-US", "region.detected", { regency: "Majalengka", province: "Jawa Barat" }),
    ).toBe("Location detected: Majalengka, Jawa Barat.");
  });

  it("returns plain text when no vars are passed", () => {
    expect(translate("en-US", "header.live")).toBe("Live data");
  });
});
