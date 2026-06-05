// Shared chain runner for AI insight providers. A `Provider` describes how to
// reach an upstream LLM API (endpoint, auth, request/response shape, env var,
// model list, source name) and `runProviderChain` does the rest: timeout,
// abort, status-code discrimination (429/408/5xx retryable, other 4xx hard
// stop), per-model logging, and conversion to `InsightPayload`.
//
// Adding a new provider only requires writing a new `AIProvider` value — no
// loop or error-handling code needs to be copied. See `lib/ai/index.ts` for
// the registry.
import type { EnvironmentalSnapshot, InsightPayload } from "../types";
import type { Locale } from "../i18n";

// Source values produced by an AI call (i.e. every InsightPayload source
// except the deterministic "fallback").
export type AISource = Exclude<InsightPayload["source"], "fallback">;

export interface AIProvider {
  /** Surfaced as `InsightPayload.source` on success. */
  source: AISource;
  /** Env var holding the API key. Read at call time so dev-mode .env edits work. */
  envVar: string;
  /** Ordered list of models to try — each has its own free-tier quota. */
  modelChain: readonly string[];
  /** Some providers (Gemini) embed the model in the URL, others (Groq) don't. */
  endpoint: (model: string) => string;
  /** Headers added on top of `Content-Type: application/json`. */
  authHeader: (key: string) => Record<string, string>;
  /** Request JSON body for this model + snapshot + locale. The optional
   * `extraContext` is appended verbatim to the user prompt — used by the
   * insight route to inject the latest community reports.
   */
  buildBody: (
    model: string,
    snapshot: EnvironmentalSnapshot,
    locale: Locale,
    extraContext: string,
  ) => unknown;
  /** Pluck the generated text out of the parsed JSON response. */
  parseText: (data: unknown) => string | undefined;
}

const REQUEST_TIMEOUT_MS = 18_000;

function sanitizeKey(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

type CallResult = { ok: true; text: string } | { ok: false; retryable: boolean; status?: number };

async function callModel(
  provider: AIProvider,
  model: string,
  key: string,
  snapshot: EnvironmentalSnapshot,
  locale: Locale,
  extraContext: string,
): Promise<CallResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(provider.endpoint(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...provider.authHeader(key),
      },
      body: JSON.stringify(provider.buildBody(model, snapshot, locale, extraContext)),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`[${provider.source}] ${model} → ${res.status}`, errBody.slice(0, 200));
      // 429/408/5xx → transient; next model has its own quota or might recover.
      // Other 4xx → bad key or malformed request; no other model will help.
      const retryable = res.status === 429 || res.status === 408 || res.status >= 500;
      return { ok: false, retryable, status: res.status };
    }
    const data = (await res.json()) as unknown;
    const text = provider.parseText(data)?.trim();
    if (!text) return { ok: false, retryable: true };
    return { ok: true, text };
  } catch (err) {
    console.warn(`[${provider.source}] ${model} request error`, err);
    return { ok: false, retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs the model chain for a single provider.
 * Returns `null` if the env var is unset or every model fails — letting the
 * orchestrator fall through to the next provider.
 */
export async function runProviderChain(
  provider: AIProvider,
  snapshot: EnvironmentalSnapshot,
  locale: Locale,
  extraContext = "",
): Promise<InsightPayload | null> {
  const key = sanitizeKey(process.env[provider.envVar]);
  if (!key) return null;

  const generatedAt = new Date().toISOString();
  for (const model of provider.modelChain) {
    const result = await callModel(provider, model, key, snapshot, locale, extraContext);
    if (result.ok) {
      console.log(`[${provider.source}] generated via ${model}`);
      return { generatedAt, text: result.text, source: provider.source };
    }
    if (!result.retryable) break;
  }
  return null;
}
