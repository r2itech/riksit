"use client";

import CardShell from "./CardShell";
import {
  DropIcon,
  PulseIcon,
  ThermometerIcon,
  WindIcon,
  pickWeatherIcon,
} from "@/lib/icons";
import type { BmkgWeather } from "@/lib/types";
import { Skeleton } from "./Skeleton";

interface Props {
  weather: BmkgWeather | null;
  loading: boolean;
}

export default function WeatherCard({ weather, loading }: Props) {
  if (loading) {
    return (
      <CardShell title="Cuaca Saat Ini" icon={<PulseIcon size={14} />}>
        <Skeleton className="h-3 w-40 mb-3" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardShell>
    );
  }

  const sample = weather?.samples[0] ?? null;
  if (!sample || !weather) {
    return (
      <CardShell title="Cuaca Saat Ini" icon={<PulseIcon size={14} />}>
        <p className="text-sm text-riksit-muted">
          Data cuaca BMKG tidak tersedia untuk wilayah ini.
        </p>
      </CardShell>
    );
  }

  const Icon = pickWeatherIcon(sample.weather, sample.weather_desc);
  const updated = formatLocalTime(sample.datetime);
  return (
    <CardShell
      title="Cuaca Saat Ini"
      icon={<PulseIcon size={14} />}
      hint={`upd ${updated}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="grid place-items-center w-11 h-11 rounded-full bg-riksit-neon/10 ring-1 ring-riksit-neon/30 text-riksit-neon shadow-glow shrink-0">
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-semibold text-riksit-ink leading-none">
              {Math.round(sample.t)}
            </span>
            <span className="font-mono text-sm text-riksit-muted">°C</span>
          </div>
          <p className="text-[11px] text-riksit-ink/90 truncate">{sample.weather_desc}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-2">
        <Stat
          icon={<DropIcon size={12} />}
          label="Lembap"
          value={`${Math.round(sample.hu)}%`}
        />
        <Stat
          icon={<WindIcon size={12} />}
          label="Angin"
          value={`${Math.round(sample.ws)} ${sample.wd}`}
        />
        <Stat
          icon={<ThermometerIcon size={12} />}
          label="Awan"
          value={`${Math.round(sample.tcc)}%`}
        />
      </div>
    </CardShell>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-black/30 border border-riksit-border/50 px-1.5 py-1 min-w-0">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-riksit-muted">
        <span className="text-riksit-neon shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="font-mono text-[11px] text-riksit-ink mt-0.5 leading-tight truncate">
        {value}
      </div>
    </div>
  );
}

function formatLocalTime(dt: string): string {
  // dt format: 2024-05-23 06:00:00
  const m = dt.match(/(\d{2}:\d{2})/);
  return m ? m[1] : dt.slice(11, 16) || "-";
}
