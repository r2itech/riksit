"use client";

// Minimal Supabase helper. Two surfaces only:
//   - `supabaseFetch` — typed fetch wrapper over Supabase's PostgREST endpoint
//     (used by SpottedInfoCard / LiveFeedCard for the initial list). We don't
//     pull in the full @supabase/supabase-js Postgrest builder for these reads
//     because PostgREST already accepts simple URL query params.
//   - `getSupabaseRealtime()` — lazy-init Realtime client. Only LiveFeedCard
//     needs Realtime; everywhere else stays on plain fetch to keep the
//     client bundle small.
//
// Env vars are read off the `NEXT_PUBLIC_` namespace because the anon key is
// safe to expose by design (it's RLS-gated on the Supabase side).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export interface SpottedInfo {
  id: string;
  title: string;
  description: string | null;
  severity: "info" | "warning" | "danger";
  location_name: string | null;
  province_name: string | null;
  regency_name: string | null;
  district_name: string | null;
  village_name: string | null;
  expires_at: string;
  created_at: string;
}

export interface ReportItem {
  id: string;
  username: string;
  message: string;
  is_ai: boolean;
  province_name: string | null;
  regency_name: string | null;
  district_name: string | null;
  village_name: string | null;
  created_at: string;
}

/**
 * Fetch wrapper for the Supabase PostgREST REST API. Adds the correct apikey
 * and Authorization headers and returns parsed JSON. Throws on non-2xx.
 *
 * `path` is the bit after `/rest/v1/`, e.g. `reports?village_name=eq.foo`.
 */
export async function supabaseFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase env vars are not configured.");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

let realtimeClient: SupabaseClient | null = null;

/**
 * Lazy-instantiate a Supabase client. Only LiveFeedCard touches this — every
 * other read goes through `supabaseFetch` to avoid bundling the full client
 * into pages that don't need Realtime.
 *
 * `NEXT_PUBLIC_SUPABASE_URL` is configured to already include the trailing
 * `/rest/v1/` segment so the PostgREST fetches above can concatenate paths
 * directly. The Realtime client, however, expects the bare project URL —
 * if we pass the `/rest/v1/` form, `@supabase/supabase-js` builds a broken
 * WebSocket URL (the `/rest/v1` ends up inside `/realtime/v1/websocket`).
 * Strip the suffix at this one call site so the PostgREST helpers keep
 * working unchanged.
 */
export function getSupabaseRealtime(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!realtimeClient) {
    const baseUrl = SUPABASE_URL.replace("/rest/v1/", "");
    realtimeClient = createClient(baseUrl, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return realtimeClient;
}
