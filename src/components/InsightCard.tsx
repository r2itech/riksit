"use client";

import { useMemo } from "react";
import { LeafCircuitIcon, SparkIcon } from "@/lib/icons";
import { renderMarkdown } from "@/lib/markdown";
import type { InsightPayload } from "@/lib/types";
import { Skeleton } from "./Skeleton";

interface Props {
  insight: InsightPayload | null;
  loading: boolean;
  error: string | null;
  regionLabel: string;
}

// Exhaustive map — TS will surface a missing key if `InsightPayload["source"]` grows.
const SOURCE_LABEL: Record<InsightPayload["source"], string> = {
  gemini: "via Gemini",
  groq: "via Groq",
  fallback: "via fallback",
};

export default function InsightCard({ insight, loading, error, regionLabel }: Props) {
  const html = useMemo(() => (insight?.text ? renderMarkdown(insight.text) : ""), [insight?.text]);

  return (
    <section className="glass-strong relative animate-fade-in overflow-hidden flex flex-col min-h-0 h-full">
      <div
        aria-hidden="true"
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-riksit-neon/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-riksit-cyan/10 blur-3xl pointer-events-none"
      />
      <header className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-riksit-neon/15 text-riksit-neon ring-1 ring-riksit-neon/40 shadow-glow shrink-0">
            <LeafCircuitIcon size={22} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold tracking-wide text-riksit-ink uppercase">
                AI Environmental Insight
              </h2>
              <SparkIcon size={14} className="text-riksit-cyan shrink-0" />
            </div>
            <p className="text-[11px] font-mono text-riksit-muted mt-0.5 truncate">{regionLabel}</p>
          </div>
        </div>
        {insight ? (
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-riksit-muted">Generated</div>
            <div className="font-mono text-[11px] text-riksit-ink">
              {formatLocalTimestamp(insight.generatedAt)}
            </div>
            <div className="text-[10px] font-mono text-riksit-muted">
              {SOURCE_LABEL[insight.source]}
            </div>
          </div>
        ) : null}
      </header>

      <div className="relative flex-1 min-h-0 overflow-y-auto riksit-thin-scroll px-5 sm:px-6 pb-5 sm:pb-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-32 mb-3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-3 w-24 mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-9/12" />
          </div>
        ) : error ? (
          <div className="text-sm text-riksit-danger" role="alert">
            Gagal memuat wawasan: {error}
          </div>
        ) : insight ? (
          <div
            className="insight-md text-sm text-riksit-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-sm text-riksit-muted">Memuat wawasan...</p>
        )}
      </div>
    </section>
  );
}

function formatLocalTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
