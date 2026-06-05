"use client";

import CardShell from "./CardShell";
import { WaveIcon } from "@/lib/icons";
import { pm25Band, pm25BandLabel, type Pm25Tone } from "@/lib/open-meteo";
import type { AirQuality } from "@/lib/types";
import { Skeleton } from "./Skeleton";
import { useLocale } from "./LocaleProvider";

interface Props {
  airQuality: AirQuality | null;
  loading: boolean;
}

const toneClass: Record<Pm25Tone, string> = {
  good: "text-riksit-neon ring-riksit-neon/40 bg-riksit-neon/10",
  moderate: "text-riksit-amber ring-riksit-amber/40 bg-riksit-amber/10",
  unhealthy: "text-orange-300 ring-orange-300/40 bg-orange-300/10",
  veryUnhealthy: "text-riksit-danger ring-riksit-danger/40 bg-riksit-danger/10",
  hazardous: "text-fuchsia-300 ring-fuchsia-300/40 bg-fuchsia-300/10",
  unknown: "text-riksit-muted ring-riksit-border bg-black/30",
};

export default function AirQualityCard({ airQuality, loading }: Props) {
  const { locale, t } = useLocale();
  if (loading) {
    return (
      <CardShell title={t("airQuality.title")} icon={<WaveIcon size={14} />}>
        <Skeleton className="h-3 w-32 mb-2" />
        <Skeleton className="h-14 w-full" />
      </CardShell>
    );
  }
  if (!airQuality) {
    return (
      <CardShell title={t("airQuality.title")} icon={<WaveIcon size={14} />}>
        <p className="text-xs text-riksit-muted">{t("airQuality.unavailable")}</p>
      </CardShell>
    );
  }
  const band = pm25Band(airQuality.pm2_5);
  const tone = toneClass[band.tone];
  return (
    <CardShell title={t("airQuality.title")} icon={<WaveIcon size={14} />} hint="Open-Meteo">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-riksit-muted">PM2.5</div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-semibold text-riksit-ink leading-none">
              {fmt(airQuality.pm2_5)}
            </span>
            <span className="font-mono text-[11px] text-riksit-muted">µg/m³</span>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 whitespace-nowrap ${tone}`}
        >
          {pm25BandLabel(band.tone, locale)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Pollutant label="PM10" value={airQuality.pm10} />
        <Pollutant label="NO₂" value={airQuality.no2} />
        <Pollutant label="O₃" value={airQuality.o3} />
      </div>
    </CardShell>
  );
}

function Pollutant({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md bg-black/30 border border-riksit-border/50 px-1.5 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-riksit-muted">{label}</div>
      <div className="font-mono text-[13px] text-riksit-ink mt-0.5 leading-tight">{fmt(value)}</div>
    </div>
  );
}

function fmt(v: number | null): string {
  return v === null || !Number.isFinite(v) ? "—" : v.toFixed(1);
}
