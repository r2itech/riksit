"use client";

import type { Earthquake, EnvironmentalSnapshot, InsightPayload } from "./types";
import { fetchJson } from "./fetcher";

export interface EarthquakeResponse {
  earthquake: Earthquake | null;
  checkedAt: string;
}

export async function fetchEarthquake(signal?: AbortSignal): Promise<EarthquakeResponse> {
  const res = await fetch(`/api/earthquake`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Earthquake fetch failed (${res.status})`);
  return (await res.json()) as EarthquakeResponse;
}

export async function fetchSnapshot(params: {
  villageId: string;
  provinceName: string;
  regencyName: string;
  districtName: string;
  villageName: string;
  signal?: AbortSignal;
}): Promise<EnvironmentalSnapshot> {
  const q = new URLSearchParams({
    village: params.villageId,
    provinceName: params.provinceName,
    regencyName: params.regencyName,
    districtName: params.districtName,
    villageName: params.villageName,
  });
  const res = await fetch(`/api/snapshot?${q.toString()}`, {
    signal: params.signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Snapshot fetch failed (${res.status})`);
  }
  return (await res.json()) as EnvironmentalSnapshot;
}

export async function fetchInsight(
  snapshot: EnvironmentalSnapshot,
  signal?: AbortSignal,
): Promise<InsightPayload> {
  const res = await fetch(`/api/insight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot }),
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Insight fetch failed (${res.status})`);
  }
  return (await res.json()) as InsightPayload;
}

// Re-export for clarity.
export { fetchJson };
