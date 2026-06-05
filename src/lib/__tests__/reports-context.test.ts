import { describe, expect, it } from "vitest";
import { buildReportsContextBlock } from "@/lib/reports-context";

describe("buildReportsContextBlock", () => {
  it("returns an empty string when there are no rows", () => {
    expect(buildReportsContextBlock([], "id-ID")).toBe("");
    expect(buildReportsContextBlock([], "en-US")).toBe("");
  });

  it("emits an id-ID header by default", () => {
    const block = buildReportsContextBlock(
      [
        {
          username: "siti",
          message: "Banjir di RT 03",
          is_ai: false,
          province_name: "jawa barat",
          regency_name: "majalengka",
          district_name: "majalengka",
          village_name: "majalengka kulon",
          created_at: new Date().toISOString(),
        },
      ],
      "id-ID",
    );
    expect(block).toContain("Laporan Terkini dari Masyarakat & AI Monitor:");
    expect(block).toContain("[siti] di majalengka kulon: Banjir di RT 03");
  });

  it("emits an en-US header when the locale is en-US", () => {
    const block = buildReportsContextBlock(
      [
        {
          username: "joko",
          message: "smoke smell near the market",
          is_ai: false,
          province_name: "jawa barat",
          regency_name: "bandung",
          district_name: null,
          village_name: null,
          created_at: new Date().toISOString(),
        },
      ],
      "en-US",
    );
    expect(block).toContain("Recent reports from the community & AI Monitor:");
    // Falls back to regency when village/district are null.
    expect(block).toContain("[joko] di bandung: smoke smell near the market");
  });

  it("labels AI-sourced reports as Riksit Agent regardless of username", () => {
    const block = buildReportsContextBlock(
      [
        {
          username: "system",
          message: "PM2.5 elevated",
          is_ai: true,
          province_name: null,
          regency_name: null,
          district_name: null,
          village_name: "kota baru",
          created_at: new Date().toISOString(),
        },
      ],
      "id-ID",
    );
    expect(block).toContain("[Riksit Agent] di kota baru: PM2.5 elevated");
  });

  it("collapses multiline messages to a single line so the prompt stays compact", () => {
    const block = buildReportsContextBlock(
      [
        {
          username: "anon",
          message: "line1\nline2\n\nline3",
          is_ai: false,
          province_name: "jb",
          regency_name: "m",
          district_name: "d",
          village_name: "v",
          created_at: new Date().toISOString(),
        },
      ],
      "id-ID",
    );
    expect(block).toContain("[anon] di v: line1 line2 line3");
  });
});
