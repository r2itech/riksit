"use client";

import CardShell from "./CardShell";
import { CloudIcon, pickWeatherIcon } from "@/lib/icons";
import type { ForecastDay } from "@/lib/types";
import { Skeleton } from "./Skeleton";
import { useT } from "./LocaleProvider";

interface Props {
  forecast: ForecastDay[];
  loading: boolean;
}

export default function ForecastCard({ forecast, loading }: Props) {
  const t = useT();
  if (loading) {
    return (
      <CardShell title={t("forecast.title")} icon={<CloudIcon size={14} />}>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </CardShell>
    );
  }
  if (forecast.length === 0) {
    return (
      <CardShell title={t("forecast.title")} icon={<CloudIcon size={14} />}>
        <p className="text-sm text-riksit-muted">{t("forecast.unavailable")}</p>
      </CardShell>
    );
  }
  return (
    <CardShell title={t("forecast.title")} icon={<CloudIcon size={14} />}>
      <div className="grid grid-cols-3 gap-1.5">
        {forecast.map((f) => {
          const Icon = pickWeatherIcon(f.sample.weather, f.sample.weather_desc);
          return (
            <div
              key={f.date}
              className="rounded-md bg-black/30 border border-riksit-border/50 px-1.5 py-2 flex flex-col items-center gap-1"
            >
              <div className="text-[10px] font-mono text-riksit-muted truncate w-full text-center">
                {f.dayLabel}
              </div>
              <Icon size={28} className="text-riksit-neon" />
              <div className="font-mono text-[13px] text-riksit-ink whitespace-nowrap">
                {f.tMin}°/<span className="text-riksit-neon">{f.tMax}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}
