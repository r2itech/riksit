// Client-side wrapper around our `/api/region` proxy.
// We proxy because the upstream (wilayah.id) doesn't send CORS headers, so the
// browser can't fetch it directly. The server route handles the upstream call,
// applies a 24h memory cache, and returns the data array unwrapped.
"use client";

import type { District, Province, Regency, Village } from "./types";
import { withCache } from "./cache";
import { fetchJson } from "./fetcher";

// Short client-side cache too — useful when the user reopens the dropdown
// during the same session. The server has its own 24h cache anyway.
const CLIENT_TTL = 15 * 60 * 1000;

async function fetchProxy<T extends { code: string; name: string }>(
  kind: "provinces" | "regencies" | "districts" | "villages",
  parent?: string,
): Promise<T[]> {
  const q = new URLSearchParams({ kind });
  if (parent) q.set("parent", parent);
  const data = await fetchJson<T[]>(`/api/region?${q.toString()}`);
  return Array.isArray(data) ? data : [];
}

export function getProvinces(): Promise<Province[]> {
  return withCache(`region:provinces`, CLIENT_TTL, () => fetchProxy<Province>("provinces"));
}
export function getRegencies(provinceCode: string): Promise<Regency[]> {
  return withCache(`region:regencies:${provinceCode}`, CLIENT_TTL, () =>
    fetchProxy<Regency>("regencies", provinceCode),
  );
}
export function getDistricts(regencyCode: string): Promise<District[]> {
  return withCache(`region:districts:${regencyCode}`, CLIENT_TTL, () =>
    fetchProxy<District>("districts", regencyCode),
  );
}
export function getVillages(districtCode: string): Promise<Village[]> {
  return withCache(`region:villages:${districtCode}`, CLIENT_TTL, () =>
    fetchProxy<Village>("villages", districtCode),
  );
}

/** Default region: Majalengka Kulon, Kec. Majalengka, Jawa Barat. */
export const DEFAULT_REGION = {
  provinceCode: "32",
  regencyCode: "32.10",
  districtCode: "32.10.07",
  villageCode: "32.10.07.1008",
} as const;

/** Strip common administrative prefixes for fuzzy matching. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(
      /\b(provinsi|prov\.?|daerah khusus ibukota|daerah istimewa|dki|d\.?\s*i\.?|kabupaten administrasi|kota administrasi|kabupaten|kotamadya|kota|kab\.?|kec\.?|kel\.?|desa|adm\.?)\b/gi,
      "",
    )
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findRegencyByName(list: Regency[], target: string): Regency | undefined {
  const t = normalizeName(target);
  if (!t) return undefined;
  return (
    list.find((r) => normalizeName(r.name) === t) ??
    list.find((r) => normalizeName(r.name).includes(t) || t.includes(normalizeName(r.name)))
  );
}
