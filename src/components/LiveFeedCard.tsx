"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CardShell from "./CardShell";
import { PulseIcon, SparkIcon } from "@/lib/icons";
import { Skeleton } from "./Skeleton";
import { useLocale } from "./LocaleProvider";
import { getSupabaseRealtime, type ReportItem } from "@/lib/supabase-client";
import type { DictKey } from "@/lib/i18n";

interface Props {
  onReport: () => void;
}

// Items in DOM are kept in chronological order (oldest first, newest last)
// so the ul renders top-to-bottom matching real time. The ul itself is
// pinned to the bottom of the viewport, so as new items arrive the older
// ones get pushed up and clipped at the top — like a chat ticker.
// MAX_ITEMS caps DOM depth: when a 16th item arrives we slice the oldest.
const MAX_ITEMS = 15;
// Per-item slide duration. Speed = item_height / SLIDE_MS — at ~80 px and
// 3500 ms that's ~23 px/s, which the user described as "slow and readable".
const SLIDE_MS = 3500;
// Gap (px) between items in the flex column. Used to compute the slide
// offset so the OLD items shift up by the exact distance the new item
// occupied, leaving no visual jump.
const GAP_PX = 8;

const AGENT_USERNAME = "Riksit Agent";

// Curated palette for human reporter usernames. Excludes red (looks like
// error) and white/ink (too plain). The Riksit Agent row has its own
// fixed accent, not picked from this list.
const USERNAME_COLORS = [
  "text-riksit-neon",
  "text-riksit-cyan",
  "text-riksit-amber",
  "text-pink-400",
  "text-purple-300",
  "text-orange-300",
  "text-teal-300",
] as const;

function usernameColor(name: string): string {
  if (name === AGENT_USERNAME) return "text-riksit-neon";
  // Djb2-ish hash — stable per-username so the same reporter is always the
  // same color across refreshes.
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i);
    h |= 0;
  }
  return USERNAME_COLORS[Math.abs(h) % USERNAME_COLORS.length];
}

function LiveFeedCard({ onReport }: Props) {
  const { t } = useLocale();
  const ulRef = useRef<HTMLUListElement>(null);
  const { reports, tick, loading } = useReportsFeed();

  // Ticker animation: every time a new item is appended (tick bumps), we
  // pre-position the ul one item-height BELOW its resting place, then
  // animate back to 0 over SLIDE_MS. The result is that the new item
  // slides up from below while the existing items also drift upward by
  // the same amount — no jump. useLayoutEffect runs after DOM updates
  // but BEFORE paint so the user never sees the un-translated state.
  useLayoutEffect(() => {
    if (tick === 0) return;
    const ul = ulRef.current;
    if (!ul) return;
    const last = ul.lastElementChild as HTMLElement | null;
    if (!last) return;
    const offset = last.offsetHeight + GAP_PX;
    ul.style.transition = "none";
    ul.style.transform = `translateY(${offset}px)`;
    // Force a reflow so the browser commits the "none" transition before
    // we swap in the animated one. Without this the browser would coalesce
    // the two style mutations and skip the animation entirely.
    void ul.offsetHeight;
    ul.style.transition = `transform ${SLIDE_MS}ms ease-out`;
    ul.style.transform = "translateY(0)";
  }, [tick]);

  return (
    <CardShell title={t("feed.title")} icon={<PulseIcon size={14} />} scrollBody={false}>
      <div className="relative flex flex-col h-full min-h-0 gap-2">
        <div className="relative flex-1 min-h-0 overflow-hidden">
          {loading && reports.length === 0 ? (
            <div className="absolute inset-x-0 bottom-0 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-11/12" />
              <Skeleton className="h-10 w-10/12" />
            </div>
          ) : reports.length === 0 ? (
            <p className="absolute inset-x-0 bottom-0 text-xs text-riksit-muted">
              {t("feed.empty")}
            </p>
          ) : (
            <ul
              ref={ulRef}
              className="absolute inset-x-0 bottom-0 flex flex-col"
              style={{ gap: `${GAP_PX}px` }}
            >
              {reports.map((r) => (
                <FeedRow key={r.id} report={r} />
              ))}
            </ul>
          )}
        </div>

        <FakeChatInput placeholder={t("feed.inputPlaceholder")} onClick={onReport} />
      </div>
    </CardShell>
  );
}

function FakeChatInput({ placeholder, onClick }: { placeholder: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        shrink-0 w-full px-3 py-2 rounded-full
        bg-black/40 border border-riksit-border/60
        text-left text-[12px] text-riksit-muted font-mono
        hover:bg-black/55 hover:border-riksit-neon/40 hover:text-riksit-ink
        focus:outline-none focus:ring-2 focus:ring-riksit-neon/40
        transition-colors cursor-text
      "
    >
      {placeholder}
    </button>
  );
}

function FeedRow({ report }: { report: ReportItem }) {
  const { t, locale } = useLocale();
  const location = useMemo(() => mostSpecificLocation(report), [report]);
  const timeAgo = useMemo(
    () => formatTimeAgo(report.created_at, t, locale),
    [report.created_at, t, locale],
  );
  const isAi = report.is_ai;
  const displayName = isAi ? t("feed.aiSource") : report.username;
  const nameColor = usernameColor(displayName);

  return (
    <li
      className={`p-2 rounded-lg border ${
        isAi ? "bg-riksit-cyan/5 border-riksit-cyan/30" : "bg-black/30 border-riksit-border/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isAi ? <SparkIcon size={11} className="text-riksit-cyan shrink-0" /> : null}
          <span className={`text-[11px] font-semibold truncate ${nameColor}`}>{displayName}</span>
        </div>
        <span className="text-[9px] font-mono text-riksit-muted shrink-0">{timeAgo}</span>
      </div>
      <p className="text-[11px] text-riksit-ink leading-snug whitespace-pre-wrap break-words">
        {report.message}
      </p>
      {location ? (
        <p className="text-[9px] font-mono text-riksit-muted mt-1 truncate">{location}</p>
      ) : null}
    </li>
  );
}

function mostSpecificLocation(r: ReportItem): string {
  return r.village_name || r.district_name || r.regency_name || r.province_name || "";
}

function formatTimeAgo(
  iso: string,
  t: (k: DictKey, vars?: Record<string, string | number>) => string,
  locale: string,
): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return iso;
  const diff = Date.now() - ts;
  if (diff < 60_000) return t("feed.timeAgo.justNow");
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return t("feed.timeAgo.minutes", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("feed.timeAgo.hours", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("feed.timeAgo.days", { n: days });
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

interface FeedHookResult {
  reports: ReportItem[];
  /** Bumps once per Realtime INSERT — drives the slide animation. Stays 0
   * on initial fetch so the loaded items don't animate in. */
  tick: number;
  loading: boolean;
}

function useReportsFeed(): FeedHookResult {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/reports`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`reports ${res.status}`);
        const rows = (await res.json()) as ReportItem[];
        if (ctrl.signal.aborted) return;
        // API returns newest-first; flip so newest sits at the END of the
        // array (= bottom of the ul), matching the ticker's chronological
        // top-to-bottom layout. Also cap to MAX_ITEMS up front.
        const ordered = [...rows].reverse().slice(-MAX_ITEMS);
        setReports(ordered);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        console.warn("[feed] initial fetch failed", err);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const client = getSupabaseRealtime();
    if (!client) return;

    const channel = client
      .channel(`reports-feed-all`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          const row = payload.new as ReportItem;
          setReports((prev) => {
            if (prev.some((r) => r.id === row.id)) return prev;
            // Append to the END (bottom) and cap to MAX_ITEMS. The oldest
            // (now off-screen above) is dropped from the DOM.
            return [...prev, row].slice(-MAX_ITEMS);
          });
          setTick((n) => n + 1);
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  // Recompute time-ago labels every 30 s so "baru saja" → "1 menit lalu"
  // ticks over without needing a fresh Realtime event.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return { reports, tick, loading };
}

// Memoize the public surface. The parent (RiksitApp) re-renders every
// ~90 s when the earthquake poll updates `snapshot`; that triggered a
// fresh `useLayoutEffect` measure + render of the entire feed list. The
// only prop is `onReport`, which RiksitApp wraps in `useCallback`, so
// the default shallow compare is sufficient — no custom comparator
// needed.
export default memo(LiveFeedCard);
