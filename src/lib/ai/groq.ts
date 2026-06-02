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
      max_tokens: 800,
      top_p: 0.9,
    };
  },
  parseText: (data) => {
    const r = data as GroqResponse;
    return r.choices?.[0]?.message?.content;
  },
};
