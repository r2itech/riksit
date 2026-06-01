"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_REGION,
  findRegencyByName,
  getDistricts,
  getProvinces,
  getRegencies,
  getVillages,
} from "@/lib/region-api";
import { reverseGeocode } from "@/lib/nominatim";
import type { District, Province, Regency, Village } from "@/lib/types";
import { CompassIcon } from "@/lib/icons";
import SearchableSelect from "./SearchableSelect";

// The four region codes are Kemendagri dot-separated strings, matching BMKG.
// We keep the *Id field names for backward compatibility with the URL params
// shape elsewhere, but their values are now the dot-separated codes.
export interface RegionIds {
  provinceId: string;
  regencyId: string;
  districtId: string;
  villageId: string;
}

export interface RegionResolved extends RegionIds {
  provinceName: string;
  regencyName: string;
  districtName: string;
  villageName: string;
}

interface Props {
  initial?: Partial<RegionIds>;
  /**
   * Authoritative current selection from the parent. If it differs from the
   * dropdown's internal state, the dropdowns will sync to it. Used by the
   * click-to-select map handler so the dropdowns mirror the clicked region.
   */
  selected?: Partial<RegionIds>;
  onChange: (region: RegionResolved) => void;
}

type LocateState = "idle" | "locating" | "done" | "error";

export default function RegionSelector({ initial, selected: external, onChange }: Props) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  const [provinceCode, setProvinceCode] = useState<string>(initial?.provinceId ?? "");
  const [regencyCode, setRegencyCode] = useState<string>(initial?.regencyId ?? "");
  const [districtCode, setDistrictCode] = useState<string>(initial?.districtId ?? "");
  const [villageCode, setVillageCode] = useState<string>(initial?.villageId ?? "");

  const [locateState, setLocateState] = useState<LocateState>("idle");
  const [locateMessage, setLocateMessage] = useState<string>("");

  const lastEmittedRef = useRef<string>("");
  const lastSyncedExternalRef = useRef<string>("");
  const autoDetectedRef = useRef(false);

  const selected = useMemo(() => {
    const p = provinces.find((x) => x.code === provinceCode) ?? null;
    const r = regencies.find((x) => x.code === regencyCode) ?? null;
    const d = districts.find((x) => x.code === districtCode) ?? null;
    const v = villages.find((x) => x.code === villageCode) ?? null;
    return { p, r, d, v };
  }, [
    provinces,
    regencies,
    districts,
    villages,
    provinceCode,
    regencyCode,
    districtCode,
    villageCode,
  ]);

  useEffect(() => {
    let active = true;
    getProvinces()
      .then((list) => {
        if (active) setProvinces(list);
      })
      .catch((err) => console.warn("[region] provinces", err));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!provinceCode) {
      setRegencies([]);
      return;
    }
    let active = true;
    getRegencies(provinceCode)
      .then((list) => {
        if (active) setRegencies(list);
      })
      .catch((err) => console.warn("[region] regencies", err));
    return () => {
      active = false;
    };
  }, [provinceCode]);

  useEffect(() => {
    if (!regencyCode) {
      setDistricts([]);
      return;
    }
    let active = true;
    getDistricts(regencyCode)
      .then((list) => {
        if (active) setDistricts(list);
      })
      .catch((err) => console.warn("[region] districts", err));
    return () => {
      active = false;
    };
  }, [regencyCode]);

  useEffect(() => {
    if (!districtCode) {
      setVillages([]);
      return;
    }
    let active = true;
    getVillages(districtCode)
      .then((list) => {
        if (active) setVillages(list);
      })
      .catch((err) => console.warn("[region] villages", err));
    return () => {
      active = false;
    };
  }, [districtCode]);

  useEffect(() => {
    const { p, r, d, v } = selected;
    if (!p || !r || !d || !v) return;
    const key = `${p.code}|${r.code}|${d.code}|${v.code}`;
    if (lastEmittedRef.current === key) return;
    lastEmittedRef.current = key;
    onChange({
      provinceId: p.code,
      regencyId: r.code,
      districtId: d.code,
      villageId: v.code,
      provinceName: p.name,
      regencyName: r.name,
      districtName: d.name,
      villageName: v.name,
    });
  }, [selected, onChange]);

  // Mirror an externally-set selection (e.g. from a map click) into our
  // dropdown state. Only reacts to *external* changes — comparing against
  // local state would revert partial in-progress selections (e.g. when the
  // user picks a new province, the cascade reset clears villageCode and the
  // effect would otherwise interpret that as a divergence to "correct".)
  useEffect(() => {
    if (!external?.villageId) return;
    const key = `${external.provinceId ?? ""}|${external.regencyId ?? ""}|${external.districtId ?? ""}|${external.villageId}`;
    if (key === lastSyncedExternalRef.current) return;
    lastSyncedExternalRef.current = key;
    if (external.provinceId) setProvinceCode(external.provinceId);
    if (external.regencyId) setRegencyCode(external.regencyId);
    if (external.districtId) setDistrictCode(external.districtId);
    setVillageCode(external.villageId);
    autoDetectedRef.current = true;
  }, [external?.provinceId, external?.regencyId, external?.districtId, external?.villageId]);

  useEffect(() => {
    if (autoDetectedRef.current) return;
    if (provinces.length === 0) return;
    if (initial?.villageId) {
      autoDetectedRef.current = true;
      return;
    }
    autoDetectedRef.current = true;
    let active = true;

    const fallback = () => {
      if (!active) return;
      setLocateState("done");
      setLocateMessage("Menggunakan wilayah default: Majalengka.");
      setProvinceCode(DEFAULT_REGION.provinceCode);
      setRegencyCode(DEFAULT_REGION.regencyCode);
      setDistrictCode(DEFAULT_REGION.districtCode);
      setVillageCode(DEFAULT_REGION.villageCode);
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fallback();
      return;
    }

    setLocateState("locating");
    setLocateMessage("Mendeteksi lokasi...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { regency, province } = await reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          if (!active) return;
          if (!province) {
            fallback();
            return;
          }
          const prov = provinces.find((p) => normalize(p.name) === normalize(province));
          if (!prov) {
            fallback();
            return;
          }
          const regList = await getRegencies(prov.code);
          if (!active) return;
          const reg = regency ? findRegencyByName(regList, regency) : undefined;
          if (!reg) {
            const first = regList[0];
            if (!first) {
              fallback();
              return;
            }
            const distList = await getDistricts(first.code);
            if (!active) return;
            const firstDist = distList[0];
            const villList = firstDist ? await getVillages(firstDist.code) : [];
            if (!active) return;
            const firstVill = villList[0];
            if (!firstDist || !firstVill) {
              fallback();
              return;
            }
            setProvinceCode(prov.code);
            setRegencyCode(first.code);
            setDistrictCode(firstDist.code);
            setVillageCode(firstVill.code);
            setLocateState("done");
            setLocateMessage(`Lokasi terdeteksi: ${prov.name}.`);
            return;
          }
          const distList = await getDistricts(reg.code);
          if (!active) return;
          const firstDist = distList[0];
          const villList = firstDist ? await getVillages(firstDist.code) : [];
          if (!active) return;
          const firstVill = villList[0];
          if (!firstDist || !firstVill) {
            fallback();
            return;
          }
          setProvinceCode(prov.code);
          setRegencyCode(reg.code);
          setDistrictCode(firstDist.code);
          setVillageCode(firstVill.code);
          setLocateState("done");
          setLocateMessage(`Lokasi terdeteksi: ${reg.name}, ${prov.name}.`);
        } catch (err) {
          if (!active) return;
          console.warn("[region] reverse geocode failed", err);
          fallback();
        }
      },
      (err) => {
        if (!active) return;
        console.info("[region] geolocation denied/unavailable", err.code);
        setLocateState("error");
        fallback();
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 },
    );

    return () => {
      active = false;
    };
  }, [provinces, initial]);

  const handleProvince = (code: string) => {
    setProvinceCode(code);
    setRegencyCode("");
    setDistrictCode("");
    setVillageCode("");
  };
  const handleRegency = (code: string) => {
    setRegencyCode(code);
    setDistrictCode("");
    setVillageCode("");
  };
  const handleDistrict = (code: string) => {
    setDistrictCode(code);
    setVillageCode("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <SearchableSelect
          value={provinceCode}
          options={provinces}
          placeholder="— Provinsi —"
          ariaLabel="Pilih provinsi"
          title="Provinsi"
          onChange={handleProvince}
        />
        <SearchableSelect
          value={regencyCode}
          options={regencies}
          placeholder="— Kab/Kota —"
          ariaLabel="Pilih kabupaten atau kota"
          title="Kab/Kota"
          onChange={handleRegency}
          disabled={!provinceCode || regencies.length === 0}
        />
        <SearchableSelect
          value={districtCode}
          options={districts}
          placeholder="— Kecamatan —"
          ariaLabel="Pilih kecamatan"
          title="Kecamatan"
          onChange={handleDistrict}
          disabled={!regencyCode || districts.length === 0}
        />
        <SearchableSelect
          value={villageCode}
          options={villages}
          placeholder="— Desa/Kel —"
          ariaLabel="Pilih desa atau kelurahan"
          title="Desa/Kel"
          onChange={setVillageCode}
          disabled={!districtCode || villages.length === 0}
        />
      </div>
      <div className="flex items-center gap-2 text-[10px] font-mono text-riksit-muted">
        <CompassIcon size={12} className="text-riksit-neon" />
        <span aria-live="polite" className="truncate">
          {locateState === "locating"
            ? "Mendeteksi lokasi..."
            : locateMessage || "Pilih wilayah dari dropdown atau klik peta"}
        </span>
      </div>
    </div>
  );
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(provinsi|prov\.?|daerah istimewa|daerah khusus ibukota|dki)\b/gi, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
