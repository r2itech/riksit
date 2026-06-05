"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldIcon } from "@/lib/icons";
import { useLocale } from "./LocaleProvider";
import type { SpottedInfo } from "@/lib/supabase-client";
import type { DictKey } from "@/lib/i18n";

// Region-name hierarchy passed from RiksitApp. Lowercased before send.
export interface RegionNames {
  province: string;
  regency: string;
  district: string;
  village: string;
}

interface Props {
  region: RegionNames | null;
  variant?: "card" | "banner";
  /** Fires whenever the active-item count changes (post-fetch). Use this to
   * collapse a slot when the card would otherwise render nothing. */
  onActiveCountChange?: (count: number) => void;
}

const POLL_MS = 5 * 60 * 1000;

const SEVERITY_TONE: Record<SpottedInfo["severity"], { dot: string; badge: string }> = {
  info: {
    dot: "bg-riksit-cyan",
    badge: "bg-riksit-cyan/10 text-riksit-cyan ring-riksit-cyan/30",
  },
  warning: {
    dot: "bg-riksit-amber",
    badge: "bg-riksit-amber/10 text-riksit-amber ring-riksit-amber/30",
  },
  danger: {
    dot: "bg-riksit-danger",
    badge: "bg-riksit-danger/10 text-riksit-danger ring-riksit-danger/30",
  },
};

const SEVERITY_LABEL_KEY: Record<SpottedInfo["severity"], DictKey> = {
  info: "spotted.severity.info",
  warning: "spotted.severity.warning",
  danger: "spotted.severity.danger",
};

export default function SpottedInfoCard({ region, variant = "card", onActiveCountChange }: Props) {
  const { t } = useLocale();
  const items = useSpottedInfo(region);

  useEffect(() => {
    onActiveCountChange?.(items.length);
  }, [items.length, onActiveCountChange]);

  if (!items.length) return null;

  // Shared header used by both variants. The icon badge gets a small amber
  // ping dot on top-right to signal "live / active right now" — visually
  // marrying the spotlight border pulse with a per-card live indicator.
  const header = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="relative grid place-items-center w-8 h-8 rounded-lg bg-riksit-amber/25 text-riksit-amber ring-1 ring-riksit-amber/60 shrink-0 shadow-[0_0_12px_rgba(255,181,71,0.35)]">
        <ShieldIcon size={15} />
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-riksit-amber shadow-[0_0_8px_rgba(255,181,71,0.9)] animate-pulse-slow"
        />
      </span>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-riksit-amber truncate">
          {t("spotted.title")}
        </h2>
        <span className="text-[9px] font-mono text-riksit-amber/80 shrink-0">{items.length}</span>
      </div>
    </div>
  );

  if (variant === "banner") {
    return (
      <div role="alert" className="spotlight animate-fade-in p-3">
        <div className="mb-2">{header}</div>
        <ul className="space-y-2">
          {items.map((it) => (
            <SpottedRow key={it.id} item={it} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section
      role="region"
      aria-label={t("spotted.title")}
      className="spotlight relative animate-fade-in flex flex-col min-h-0 h-full overflow-hidden"
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2 shrink-0">
        {header}
      </header>
      <div className="flex-1 min-h-0 px-3 pb-2.5 overflow-y-auto riksit-thin-scroll">
        <ul className="space-y-2.5">
          {items.map((it) => (
            <SpottedRow key={it.id} item={it} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function SpottedRow({ item }: { item: SpottedInfo }) {
  const { t } = useLocale();
  const remaining = useMemo(() => formatTimeRemaining(item.expires_at, t), [item.expires_at, t]);
  const tone = SEVERITY_TONE[item.severity] ?? SEVERITY_TONE.info;

  return (
    <li className="flex gap-2.5">
      <span
        className={`mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ${tone.badge}`}
          >
            {t(SEVERITY_LABEL_KEY[item.severity] ?? SEVERITY_LABEL_KEY.info)}
          </span>
          <p className="text-[12px] font-semibold text-riksit-ink truncate">{item.title}</p>
        </div>
        {item.description ? (
          <p className="text-[11px] text-riksit-muted mt-0.5 line-clamp-2 leading-snug">
            {item.description}
          </p>
        ) : null}
        <p className="text-[9px] font-mono text-riksit-muted mt-1 truncate">
          {item.location_name ? `${item.location_name} • ` : ""}
          {remaining}
        </p>
      </div>
    </li>
  );
}

function formatTimeRemaining(
  expiresAt: string,
  t: (k: DictKey, vars?: Record<string, string | number>) => string,
): string {
  const exp = new Date(expiresAt).getTime();
  if (!Number.isFinite(exp)) return "";
  const diff = exp - Date.now();
  if (diff <= 0) return t("spotted.expired");
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return t("spotted.expiresIn", { minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t("spotted.expiresInHours", { hours });
  const days = Math.round(hours / 24);
  return t("spotted.expiresInDays", { days });
}

function useSpottedInfo(region: RegionNames | null): SpottedInfo[] {
  const [items, setItems] = useState<SpottedInfo[]>([]);

  const fetchOnce = useCallback(
    async (signal: AbortSignal) => {
      if (!region) {
        setItems([]);
        return;
      }
      const q = new URLSearchParams({
        province: region.province,
        regency: region.regency,
        district: region.district,
        village: region.village,
      });
      try {
        const res = await fetch(`/api/spotted?${q.toString()}`, {
          signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`spotted ${res.status}`);
        const rows = (await res.json()) as SpottedInfo[];
        if (signal.aborted) return;
        const now = Date.now();
        const live = (rows ?? []).filter((r) => new Date(r.expires_at).getTime() > now);
        setItems(live);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        console.warn("[spotted] fetch failed", err);
      }
    },
    [region],
  );

  useEffect(() => {
    if (!region) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    fetchOnce(ctrl.signal);
    const interval = setInterval(() => {
      const tickCtrl = new AbortController();
      fetchOnce(tickCtrl.signal);
    }, POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(interval);
    };
  }, [region, fetchOnce]);

  return items;
}
