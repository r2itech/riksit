"use client";

import CardShell from "./CardShell";
import { BoltIcon } from "@/lib/icons";
import type { Earthquake } from "@/lib/types";
import { Skeleton } from "./Skeleton";

interface Props {
  earthquake: Earthquake | null;
  loading: boolean;
  lastChecked: string | null;
}

export default function EarthquakeCard({
  earthquake,
  loading,
  lastChecked,
}: Props) {
  if (loading) {
    return (
      <CardShell title="Gempa Terbaru" icon={<BoltIcon size={14} />}>
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-16 w-full" />
      </CardShell>
    );
  }
  if (!earthquake) {
    return (
      <CardShell title="Gempa Terbaru" icon={<BoltIcon size={14} />}>
        <p className="text-sm text-riksit-muted">
          Tidak ada data gempa terbaru.
        </p>
      </CardShell>
    );
  }
  const mag = parseFloat(earthquake.magnitude);
  const intense = Number.isFinite(mag) && mag >= 5;
  const checkedLabel = formatCheckedAt(lastChecked);
  return (
    <CardShell
      title="Gempa Terbaru"
      icon={<BoltIcon size={14} />}
      hint={`${earthquake.tanggal} ${earthquake.jam}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`grid place-items-center w-11 h-11 rounded-full ring-1 shrink-0 ${
            intense
              ? "bg-riksit-danger/15 ring-riksit-danger/50 text-riksit-danger"
              : "bg-riksit-amber/10 ring-riksit-amber/40 text-riksit-amber"
          }`}
        >
          <div className="font-mono text-base font-semibold leading-none">
            {earthquake.magnitude}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-riksit-ink leading-snug line-clamp-2">
            {earthquake.wilayah}
          </p>
          <p className="font-mono text-[9px] text-riksit-muted mt-0.5 truncate">
            {earthquake.kedalaman} • {earthquake.coordinates}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-riksit-border/40">
        <span className="pulse-dot" aria-hidden="true" />
        <span className="text-[9px] font-mono text-riksit-muted truncate">
          Last check{checkedLabel ? `: ${checkedLabel}` : ""}
        </span>
      </div>
    </CardShell>
  );
}

function formatCheckedAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
