// Gemini provider config — read by `runProviderChain` in lib/ai/chain.ts.
// Free-tier quotas are per-model, so the chain falls through on 429.
import type { AIProvider } from "./chain";
import { SYSTEM_PROMPT, summarizeSnapshot } from "./prompt";

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
  buildBody: (_model, snapshot) => ({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `${SYSTEM_PROMPT}\n\nData lingkungan saat ini:\n${summarizeSnapshot(snapshot)}\n\n` +
              `Berdasarkan data di atas, susun wawasan lingkungan untuk warga setempat.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      // 2048 is the response-side budget. Gemini 2.5 models also consume
      // tokens from this budget while "thinking" before answering, which
      // historically truncated the visible response mid-sentence. We
      // explicitly disable thinking via thinkingBudget=0 below; the larger
      // ceiling is a margin in case future models reintroduce hidden tokens.
      maxOutputTokens: 2048,
      topP: 0.9,
      // Disable Gemini 2.5's internal chain-of-thought. The task is
      // structured summarization, not multi-step reasoning, and thinking
      // tokens count against maxOutputTokens. Ignored by models that don't
      // support it (e.g. gemini-2.0-flash).
      thinkingConfig: { thinkingBudget: 0 },
    },
  }),
  parseText: (data) => {
    const r = data as GeminiResponse;
    return r.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  },
};
