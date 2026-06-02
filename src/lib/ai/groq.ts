// Groq provider config — read by `runProviderChain` in lib/ai/chain.ts.
// OpenAI-compatible chat/completions shape; auth via bearer token.
import type { AIProvider } from "./chain";
import { SYSTEM_PROMPT, summarizeSnapshot } from "./prompt";

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export const groqProvider: AIProvider = {
  source: "groq",
  envVar: "GROQ_API_KEY",
  modelChain: ["llama-3.3-70b-versatile", "gemma2-9b-it"],
  endpoint: () => "https://api.groq.com/openai/v1/chat/completions",
  authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  buildBody: (model, snapshot) => {
    const userPrompt =
      `Data lingkungan saat ini:\n${summarizeSnapshot(snapshot)}\n\n` +
      `Berdasarkan data di atas, susun wawasan lingkungan untuk warga setempat.`;
    return {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      // Matches the Gemini ceiling so both providers have room for the full
      // 3-section structured response. Llama/Gemma don't have hidden
      // "thinking" tokens, but the older 800-token cap was already tight
      // for longer EN responses.
      max_tokens: 2048,
      top_p: 0.9,
    };
  },
  parseText: (data) => {
    const r = data as GroqResponse;
    return r.choices?.[0]?.message?.content;
  },
};
