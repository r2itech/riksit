"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LeafletEventHandlerFnMap, LeafletMouseEvent } from "leaflet";
import type { EnvironmentalSnapshot } from "@/lib/types";
import { pm25Band, pm25BandLabel } from "@/lib/open-meteo";
import { useLocale } from "./LocaleProvider";

interface Props {
  snapshot: EnvironmentalSnapshot;
  onPick?: (lat: number, lon: number) => void;
  resolving?: boolean;
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
      map.setView([lat, lon], 11, { animate: true });
    }
  }, [lat, lon, map]);
  return null;
}

/**
 * Stable click handler. Memoized handler object so react-leaflet's
 * useMapEvents doesn't detach/reattach the listener on every render.
 */
function ClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const handlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      click: (e) => {
        const mouse = e as LeafletMouseEvent;
        onPickRef.current(mouse.latlng.lat, mouse.latlng.lng);
      },
    }),
    [],
  );
  useMapEvents(handlers);
  return null;
}

export default function RegionMap({ snapshot, onPick, resolving }: Props) {
  const { locale } = useLocale();
  const { lat, lon } = snapshot.region;
  const center = useMemo<[number, number]>(
    () =>
      Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)
        ? [lat, lon]
        : [-6.2, 106.8],
    [lat, lon],
  );
  const sample = snapshot.weather?.samples[0];
  const band = pm25Band(snapshot.airQuality?.pm2_5 ?? null);

  const [pending, setPending] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!pending) return;
    if (Math.abs(pending[0] - center[0]) < 0.02 && Math.abs(pending[1] - center[1]) < 0.02) {
      setPending(null);
    }
  }, [pending, center]);

  const handlePick = useCallback(
    (la: number, lo: number) => {
      setPending([la, lo]);
      onPick?.(la, lo);
    },
    [onPick],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        className={`h-full w-full ${onPick ? "cursor-crosshair" : ""}`}
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
        />
        <Recenter lat={center[0]} lon={center[1]} />
        {onPick ? <ClickHandler onPick={handlePick} /> : null}

        <CircleMarker
          center={center}
          radius={10}
          pathOptions={{
            color: "#00ff88",
            fillColor: "#00ff88",
            fillOpacity: 0.45,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1">
              <div className="font-semibold text-riksit-neon text-[12px] uppercase tracking-wide">
                {snapshot.region.villageName}
              </div>
              <div className="text-[11px] text-riksit-ink">
                {snapshot.region.districtName}, {snapshot.region.regencyName}
              </div>
              {sample ? (
                <div className="text-[11px] font-mono">
                  {Math.round(sample.t)}°C • {sample.weather_desc}
                </div>
              ) : null}
              <div className="text-[11px] font-mono">
                <span className="text-riksit-neon">{pm25BandLabel(band.tone, locale)}</span>
              </div>
            </div>
          </Popup>
        </CircleMarker>

        {pending ? (
          <CircleMarker
            center={pending}
            radius={8}
            pathOptions={{
              color: "#00e5ff",
              fillColor: "#00e5ff",
              fillOpacity: 0.6,
              weight: 2,
              dashArray: "4 3",
            }}
          />
        ) : null}
      </MapContainer>

      {resolving ? (
        <div
          className="pointer-events-none absolute z-[1000] left-1/2 -translate-x-1/2 bottom-3 flex items-center gap-1.5 rounded-full bg-riksit-bg/90 backdrop-blur px-3 py-1.5 ring-1 ring-riksit-cyan/40 shadow-glow-cyan"
          aria-live="polite"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-riksit-cyan animate-ping" />
          <span className="text-[10px] font-mono text-riksit-cyan">Memuat wilayah...</span>
        </div>
      ) : null}
    </div>
  );
}
