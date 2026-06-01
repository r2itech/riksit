// Nominatim reverse geocoder. Used client-side after geolocation OR map click.
"use client";

import { fetchJson } from "./fetcher";

interface NominatimResponse {
  address?: {
    village?: string;
    hamlet?: string;
    neighbourhood?: string;
    town?: string;
    city?: string;
    suburb?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    state_district?: string;
    city_district?: string;
    "ISO3166-2-lvl4"?: string;
  };
  display_name?: string;
  /** [minLat, maxLat, minLon, maxLon] as strings. */
  boundingbox?: string[];
}

export interface ReverseHit {
  province: string | null;
  regency: string | null;
  district: string | null;
  village: string | null;
  /** ISO 3166-2 subdivision code (e.g. "ID-JK"). Useful when `province` is missing. */
  iso3166: string | null;
  raw: NominatimResponse;
}

/**
 * Reverse geocode lat/lon. zoom=15 reliably surfaces the kelurahan level for
 * Indonesia in OSM Nominatim ('village' field). Lower zoom collapses to
 * regency / state only.
 */
export async function reverseGeocode(lat: number, lon: number, zoom = 15): Promise<ReverseHit> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}` +
    `&format=json&accept-language=id&zoom=${zoom}&addressdetails=1`;
  const raw = await fetchJson<NominatimResponse>(url, { timeoutMs: 6000 });
  const a = raw.address ?? {};
  return {
    // `region` is too coarse for Indonesia (it's the macro island, e.g. "Jawa"),
    // so we deliberately do not fall back to it for province.
    province: a.state ?? null,
    regency: a.county ?? a.city ?? a.municipality ?? a.town ?? a.state_district ?? null,
    district: a.suburb ?? a.city_district ?? null,
    village: a.village ?? a.hamlet ?? a.neighbourhood ?? null,
    iso3166: a["ISO3166-2-lvl4"] ?? null,
    raw,
  };
}
