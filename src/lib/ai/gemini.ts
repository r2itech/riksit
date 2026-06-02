// Gemini provider config — read by `runProviderChain` in lib/ai/chain.ts.
// Free-tier quotas are per-model, so the chain falls through on 429.
import type { AIProvider } from "./chain";
import {
  getContextHeader,
  getSystemPrompt,
  getUserCallToAction,
  summarizeSnapshot,
} from "./prompt";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export const geminiProvider: AIProvider = {
  source: "gemini",
  envVar: "GEMINI_API_KEY",
  modelChain: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
  endpoint: (model) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  authHeader: (key) => ({ "x-goog-api-key": key }),
  buildBody: (_model, snapshot, locale) => ({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `${getSystemPrompt(locale)}\n\n${getContextHeader(locale)}\n${summarizeSnapshot(snapshot, locale)}\n\n` +
              getUserCallToAction(locale),
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.4, maxOutputTokens: 800, topP: 0.9 },
  }),
  parseText: (data) => {
    const r = data as GeminiResponse;
    return r.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  },
};
