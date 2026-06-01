"use client";

import { LeafCircuitIcon } from "@/lib/icons";

interface Props {
  live: boolean;
  regionLabel?: string;
}

export default function Header({ live, regionLabel }: Props) {
  return (
    <header className="shrink-0 z-30 backdrop-blur-md bg-riksit-bg/70 border-b border-riksit-border/50">
      <div className="mx-auto w-full px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-riksit-neon/15 text-riksit-neon ring-1 ring-riksit-neon/40 shadow-glow shrink-0">
            <LeafCircuitIcon size={18} />
          </span>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold tracking-[0.25em] text-riksit-ink text-base">RIKSIT</h1>
              <span className="hidden sm:inline text-[10px] font-mono text-riksit-muted uppercase">
                Environmental AI
              </span>
            </div>
            {regionLabel ? (
              <p className="font-mono text-[10px] text-riksit-muted truncate max-w-[60vw] sm:max-w-md">
                {regionLabel}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="pulse-dot"
            style={live ? undefined : { animation: "none", opacity: 0.5 }}
            aria-hidden="true"
          />
          <span className="text-[10px] font-mono text-riksit-muted">
            {live ? "Live data stream" : "Standby"}
          </span>
        </div>
      </div>
    </header>
  );
}
