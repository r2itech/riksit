// Server-only Supabase REST helper. The anon key is the same one we expose to
// the browser (NEXT_PUBLIC_*) — Supabase row-level security gates access, not
// a separate server-only secret. Keeping the server helper distinct lets us
// re-use it from API routes and from the insight context fetcher without
// pulling the "use client" boundary into them.
//
// NOTE: `NEXT_PUBLIC_SUPABASE_URL` is expected to already include the
// `/rest/v1/` path segment (e.g. `https://<project>.supabase.co/rest/v1/`),
// so callers pass just the table + query string (e.g. `reports?...`). We do
// NOT re-add `/rest/v1/` here — duplicating it produces 404s.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Server-side fetch wrapper for the Supabase PostgREST REST API.
 * Adds apikey / Authorization headers. Throws on non-2xx.
 */
export async function supabaseServerFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase env vars are not configured.");
  }
  const { timeoutMs = 9000, ...rest } = init ?? {};
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      ...rest,
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(rest.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`);
    }
    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build a PostgREST `or=()` filter that matches any one of the four region
 * hierarchy fields. Skips fields whose values are empty/whitespace so we
 * never emit `or=(...,village_name=eq.)` which Supabase rejects.
 */
export function regionOrFilter(params: {
  province?: string | null;
  regency?: string | null;
  district?: string | null;
  village?: string | null;
}): string {
  const clauses: string[] = [];
  const push = (col: string, value: string | null | undefined) => {
    const v = value?.trim().toLowerCase();
    if (!v) return;
    // PostgREST treats `,` `(` `)` specially inside `or=()`; the values in
    // our app never contain them, but encode defensively anyway.
    clauses.push(`${col}.eq.${encodeURIComponent(v)}`);
  };
  push("village_name", params.village);
  push("district_name", params.district);
  push("regency_name", params.regency);
  push("province_name", params.province);
  if (clauses.length === 0) return "";
  return `or=(${clauses.join(",")})`;
}
