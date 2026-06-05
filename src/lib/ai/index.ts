// AI insight orchestrator. The route handler calls `generateInsight` and
// doesn't know — or need to know — which provider produced the result.
//
// To add a new AI provider:
//   1. Create a new `AIProvider` config (see `chain.ts` for the interface
//      and `gemini.ts` / `groq.ts` for examples).
//   2. Append it to the `PROVIDERS` array below in the desired priority.
//   3. Extend `InsightPayload["source"]` in `src/lib/types.ts` with the new
//      source string.
//   4. Add a label entry in `src/components/InsightCard.tsx` →
//      `SOURCE_LABEL`. TypeScript will require it once step 3 is done.
import type { EnvironmentalSnapshot, InsightPayload } from "../types";
import type { Locale } from "../i18n";
import { runProviderChain } from "./chain";
import { buildFallback } from "./fallback";
import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import { buildReportsContextBlock, fetchReportsForRegion } from "../reports-context";

const PROVIDERS = [geminiProvider, groqProvider] as const;

export async function generateInsight(
  snapshot: EnvironmentalSnapshot,
  locale: Locale,
): Promise<InsightPayload> {
  // Fetch reports in parallel with provider env-var resolution. A failure
  // here resolves to []; the providers will simply not see the section.
  const reportRows = await fetchReportsForRegion(snapshot);
  const extraContext = buildReportsContextBlock(reportRows, locale);

  for (const provider of PROVIDERS) {
    const result = await runProviderChain(provider, snapshot, locale, extraContext);
    if (result) return result;
  }
  return {
    generatedAt: new Date().toISOString(),
    text: buildFallback(snapshot, locale),
    source: "fallback",
  };
}

export { buildFallback };
