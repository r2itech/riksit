// Given a lat/lon, walks wilayah.id (proxied via /api/region) to find the most
// specific admin region match. Used by the map's click-to-select handler.
"use client";

import {
  getDistricts,
  getProvinces,
  getRegencies,
  getVillages,
  normalizeName,
} from "./region-api";
import { reverseGeocode } from "./nominatim";

// ISO 3166-2:ID → wilayah.id province code. Nominatim always emits this field,
// even when it omits `state`, so it is our most reliable province handle.
const ISO_PROVINCE: Record<string, string> = {
  "ID-AC": "11", // Aceh
  "ID-SU": "12", // Sumatera Utara
  "ID-SB": "13", // Sumatera Barat
  "ID-RI": "14", // Riau
  "ID-JA": "15", // Jambi
  "ID-SS": "16", // Sumatera Selatan
  "ID-BE": "17", // Bengkulu
  "ID-LA": "18", // Lampung
  "ID-BB": "19", // Kep. Bangka Belitung
  "ID-KR": "21", // Kep. Riau
  "ID-JK": "31", // DKI Jakarta
  "ID-JB": "32", // Jawa Barat
  "ID-JT": "33", // Jawa Tengah
  "ID-YO": "34", // DI Yogyakarta
  "ID-JI": "35", // Jawa Timur
  "ID-BT": "36", // Banten
  "ID-BA": "51", // Bali
  "ID-NB": "52", // Nusa Tenggara Barat
  "ID-NT": "53", // Nusa Tenggara Timur
  "ID-KB": "61", // Kalimantan Barat
  "ID-KT": "62", // Kalimantan Tengah
  "ID-KS": "63", // Kalimantan Selatan
  "ID-KI": "64", // Kalimantan Timur
  "ID-KU": "65", // Kalimantan Utara
  "ID-SA": "71", // Sulawesi Utara
  "ID-ST": "72", // Sulawesi Tengah
  "ID-SN": "73", // Sulawesi Selatan
  "ID-SG": "74", // Sulawesi Tenggara
  "ID-GO": "75", // Gorontalo
  "ID-SR": "76", // Sulawesi Barat
  "ID-MA": "81", // Maluku
  "ID-MU": "82", // Maluku Utara
  "ID-PA": "91", // Papua
  "ID-PB": "92", // Papua Barat
  "ID-PS": "93", // Papua Selatan
  "ID-PT": "94", // Papua Tengah
  "ID-PE": "95", // Papua Pegunungan
  "ID-PD": "96", // Papua Barat Daya
};

export interface ResolvedRegion {
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  villageCode: string;
  provinceName: string;
  regencyName: string;
  districtName: string;
  villageName: string;
  /** True when every admin level matched by name. False if any fell back. */
  exact: boolean;
}

function findByName<T extends { name: string }>(
  list: T[],
  target: string | null,
): T | undefined {
  if (!target) return undefined;
  const t = normalizeName(target);
  if (!t) return undefined;
  return (
    list.find((x) => normalizeName(x.name) === t) ??
    list.find((x) => {
      const n = normalizeName(x.name);
      return n.includes(t) || t.includes(n);
    })
  );
}

export async function resolveByCoordinates(
  lat: number,
  lon: number,
): Promise<ResolvedRegion | null> {
  const hit = await reverseGeocode(lat, lon, 15);
  if (!hit.province && !hit.iso3166) return null;

  const provinces = await getProvinces();
  // Prefer ISO 3166-2 — it survives when Nominatim drops the verbose state name
  // (notably for DKI Jakarta).
  const isoCode = hit.iso3166 ? ISO_PROVINCE[hit.iso3166] : undefined;
  const prov =
    (isoCode ? provinces.find((p) => p.code === isoCode) : undefined) ??
    findByName(provinces, hit.province);
  if (!prov) return null;

  const regencies = await getRegencies(prov.code);
  if (regencies.length === 0) return null;
  const regMatch = findByName(regencies, hit.regency);
  const reg = regMatch ?? regencies[0];

  const districts = await getDistricts(reg.code);
  if (districts.length === 0) return null;
  const distMatch = findByName(districts, hit.district);
  const dist = distMatch ?? districts[0];

  const villages = await getVillages(dist.code);
  if (villages.length === 0) return null;
  const vilMatch = findByName(villages, hit.village);
  const vil = vilMatch ?? villages[0];

  return {
    provinceCode: prov.code,
    regencyCode: reg.code,
    districtCode: dist.code,
    villageCode: vil.code,
    provinceName: prov.name,
    regencyName: reg.name,
    districtName: dist.name,
    villageName: vil.name,
    exact: Boolean(regMatch && distMatch && vilMatch),
  };
}
