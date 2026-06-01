"use client";

import { ShieldIcon } from "@/lib/icons";
import type { EarlyWarning } from "@/lib/types";

interface Props {
  warnings: EarlyWarning[];
}

export default function WarningBanner({ warnings }: Props) {
  if (warnings.length === 0) return null;
  return (
    <div
      role="alert"
      className="glass neon-border bg-riksit-amber/5 border-riksit-amber/30 p-4 animate-fade-in"
      style={{ borderColor: "rgba(255, 181, 71, 0.35)" }}
    >
      <div className="flex items-start gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-full bg-riksit-amber/15 text-riksit-amber ring-1 ring-riksit-amber/40 shrink-0">
          <ShieldIcon size={18} />
        </span>
        <div className="space-y-1.5">
          {warnings.map((w, idx) => (
            <div key={idx}>
              <div className="text-xs uppercase tracking-[0.18em] text-riksit-amber font-semibold">
                Peringatan Dini
              </div>
              <div className="text-sm text-riksit-ink">{w.headline}</div>
              <div className="text-[11px] font-mono text-riksit-muted mt-0.5">{w.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
