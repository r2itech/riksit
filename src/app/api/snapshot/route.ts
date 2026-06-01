import { NextResponse } from "next/server";
import { buildForecast, getBmkgWeather, getEarlyWarnings, getLatestEarthquake } from "@/lib/bmkg";
import { getAirQuality } from "@/lib/open-meteo";
import { isVillageCode, type EnvironmentalSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  // The `village` param is the Kemendagri adm4 code (e.g. "32.10.07.1008").
  // Some clients may strip the dots from URLs, so accept both forms.
  const rawVillage = (url.searchParams.get("village") ?? "").trim();
  const villageCode = /^\d{10}$/.test(rawVillage)
    ? `${rawVillage.slice(0, 2)}.${rawVillage.slice(2, 4)}.${rawVillage.slice(4, 6)}.${rawVillage.slice(6, 10)}`
    : rawVillage;
  const provinceName = url.searchParams.get("provinceName") ?? "";
  const regencyName = url.searchParams.get("regencyName") ?? "";
  const districtName = url.searchParams.get("districtName") ?? "";
  const villageName = url.searchParams.get("villageName") ?? "";

  if (!isVillageCode(villageCode)) {
    return NextResponse.json(
      { error: "Parameter `village` harus berformat kode adm4 BMKG (mis. 32.10.07.1008)." },
      { status: 400 },
    );
  }

  // Step 1: kick off BMKG weather + earthquake in parallel. Earthquake has no
  // dependency on weather, so there's no reason to serialize it.
  const [weather, earthquake] = await Promise.all([
    getBmkgWeather(villageCode),
    getLatestEarthquake(),
  ]);
  const lat = weather?.location.lat ?? 0;
  const lon = weather?.location.lon ?? 0;

  // Step 2: air quality requires lat/lon from weather.
  const airQuality = weather ? await getAirQuality(lat, lon) : null;

  const forecast = buildForecast(weather, 3);
  const warnings = await getEarlyWarnings(weather);

  const snapshot: EnvironmentalSnapshot = {
    region: {
      provinceName: provinceName || weather?.location.provinsi || "-",
      regencyName: regencyName || weather?.location.kotkab || "-",
      districtName: districtName || weather?.location.kecamatan || "-",
      villageName: villageName || weather?.location.desa || "-",
      lat,
      lon,
    },
    weather,
    forecast,
    airQuality,
    earthquake,
    warnings,
  };

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
