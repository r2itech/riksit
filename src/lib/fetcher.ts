// Cancellable fetch with timeout. Throws Error("timeout") if the upstream takes
// longer than `timeoutMs`. Re-throws upstream errors so the caller can decide.
// Honors any AbortSignal passed via `init.signal` by chaining it to the
// internal timeout-aware controller.

function linkSignal(internal: AbortController, external?: AbortSignal | null) {
  if (!external) return () => {};
  if (external.aborted) {
    internal.abort((external as AbortSignal & { reason?: unknown }).reason);
    return () => {};
  }
  const onAbort = () => {
    internal.abort((external as AbortSignal & { reason?: unknown }).reason);
  };
  external.addEventListener("abort", onAbort, { once: true });
  return () => external.removeEventListener("abort", onAbort);
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = 9000, signal: externalSignal, ...rest } = init ?? {};
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
  const unlink = linkSignal(ctrl, externalSignal ?? null);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: ctrl.signal,
      // The free public APIs use lax CORS; the proxy route handles server fetches.
      headers: {
        Accept: "application/json",
        ...(rest.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    unlink();
  }
}

export async function fetchText(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<string> {
  const { timeoutMs = 9000, signal: externalSignal, ...rest } = init ?? {};
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
  const unlink = linkSignal(ctrl, externalSignal ?? null);
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
    unlink();
  }
}
