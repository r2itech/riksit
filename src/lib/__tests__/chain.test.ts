import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateInsight } from "@/lib/ai";
import { runProviderChain } from "@/lib/ai/chain";
import { geminiProvider } from "@/lib/ai/gemini";
import { groqProvider } from "@/lib/ai/groq";
import type { EnvironmentalSnapshot } from "@/lib/types";

function makeSnapshot(): EnvironmentalSnapshot {
  return {
    region: {
      provinceName: "Jawa Barat",
      regencyName: "Majalengka",
      districtName: "Majalengka",
      villageName: "Majalengka Kulon",
      lat: -6.83,
      lon: 108.21,
    },
    weather: null,
    forecast: [],
    airQuality: null,
    earthquake: null,
    warnings: [],
  };
}

// Snapshot env vars so each test can mutate them freely without leaking into
// the next file. Both keys are touched by these tests.
const originalGemini = process.env.GEMINI_API_KEY;
const originalGroq = process.env.GROQ_API_KEY;
function restore() {
  if (originalGemini === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGemini;
  if (originalGroq === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroq;
}

describe.each([
  ["gemini", geminiProvider],
  ["groq", groqProvider],
])("runProviderChain — %s no-key short-circuit", (_name, provider) => {
  beforeEach(() => {
    delete process.env[provider.envVar];
  });
  afterEach(restore);

  it("returns null when the env var is undefined", async () => {
    expect(await runProviderChain(provider, makeSnapshot())).toBeNull();
  });

  it("returns null when the env var is an empty string", async () => {
    process.env[provider.envVar] = "";
    expect(await runProviderChain(provider, makeSnapshot())).toBeNull();
  });

  it("returns null when the env var is whitespace only", async () => {
    process.env[provider.envVar] = "   ";
    expect(await runProviderChain(provider, makeSnapshot())).toBeNull();
  });

  it("returns null when the env var is just quotes (sanitized to empty)", async () => {
    process.env[provider.envVar] = `""`;
    expect(await runProviderChain(provider, makeSnapshot())).toBeNull();
  });
});

describe("generateInsight — orchestrator", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
  });
  afterEach(restore);

  it("returns the deterministic fallback when every AI provider lacks a key", async () => {
    const result = await generateInsight(makeSnapshot());
    expect(result.source).toBe("fallback");
    expect(result.text).toContain("## Ringkasan Kondisi");
    expect(result.text).toContain("## Potensi Risiko");
    expect(result.text).toContain("## Rekomendasi");
  });
});
