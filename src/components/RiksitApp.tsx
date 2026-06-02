"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DisclaimerModal from "./DisclaimerModal";
import Header from "./Header";
import Footer from "./Footer";
import WeatherCard from "./WeatherCard";
import ForecastCard from "./ForecastCard";
import AirQualityCard from "./AirQualityCard";
import EarthquakeCard from "./EarthquakeCard";
import WarningBanner from "./WarningBanner";
import InsightCard from "./InsightCard";
import MapPanel from "./MapPanel";
import RegionSelector from "./RegionSelector";
import { fetchEarthquake, fetchInsight, fetchSnapshot } from "@/lib/client-api";
import { resolveByCoordinates } from "@/lib/region-resolver";
import type { EnvironmentalSnapshot, InsightPayload } from "@/lib/types";
import type { RegionIds, RegionResolved } from "./RegionSelector";
import { useLocale } from "./LocaleProvider";

function readInitialRegion(): Partial<RegionIds> | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const provinceId = params.get("p") ?? "";
  const regencyId = params.get("r") ?? "";
  const districtId = params.get("d") ?? "";
  const villageId = params.get("v") ?? "";
  if (provinceId && regencyId && districtId && villageId) {
    return { provinceId, regencyId, districtId, villageId };
  }
  return undefined;
}

export default function RiksitApp() {
  const { locale, t } = useLocale();
  // Defer mount until window is available so the child reads URL params on
  // first render, avoiding a race with the cascading dropdowns.
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [initialRegion, setInitialRegion] = useState<Partial<RegionIds> | undefined>(undefined);
  const [region, setRegion] = useState<RegionResolved | null>(null);
  const [snapshot, setSnapshot] = useState<EnvironmentalSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [insight, setInsight] = useState<InsightPayload | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [earthquakeCheckedAt, setEarthquakeCheckedAt] = useState<string | null>(null);
  const [mapResolving, setMapResolving] = useState(false);

  const snapshotAbortRef = useRef<AbortController | null>(null);
  const insightAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setInitialRegion(readInitialRegion());
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    setMounted(true);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // When region changes: push to URL, then fetch snapshot, then fetch insight.
  useEffect(() => {
    if (!region) return;
    // Mirror selection to URL.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("p", region.provinceId);
      params.set("r", region.regencyId);
      params.set("d", region.districtId);
      params.set("v", region.villageId);
      const next = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", next);
    }

    // Cancel any in-flight fetches.
    snapshotAbortRef.current?.abort();
    insightAbortRef.current?.abort();
    const snapCtrl = new AbortController();
    snapshotAbortRef.current = snapCtrl;

    setSnapshotLoading(true);
    setSnapshotError(null);
    setInsight(null);
    setInsightError(null);

    fetchSnapshot({
      villageId: region.villageId,
      provinceName: region.provinceName,
      regencyName: region.regencyName,
      districtName: region.districtName,
      villageName: region.villageName,
      signal: snapCtrl.signal,
    })
      .then((snap) => {
        if (snapCtrl.signal.aborted) return;
        setSnapshot(snap);
        setSnapshotLoading(false);
        setEarthquakeCheckedAt(new Date().toISOString());

        // Chain insight fetch — runs in parallel with the user seeing data.
        const insCtrl = new AbortController();
        insightAbortRef.current = insCtrl;
        setInsightLoading(true);
        fetchInsight(snap, locale, insCtrl.signal)
          .then((ins) => {
            if (insCtrl.signal.aborted) return;
            setInsight(ins);
            setInsightLoading(false);
          })
          .catch((err: unknown) => {
            if (insCtrl.signal.aborted) return;
            console.warn("[insight] failed", err);
            setInsightError(err instanceof Error ? err.message : "Unknown error");
            setInsightLoading(false);
          });
      })
      .catch((err: unknown) => {
        if (snapCtrl.signal.aborted) return;
        console.warn("[snapshot] failed", err);
        setSnapshotError(err instanceof Error ? err.message : "Unknown error");
        setSnapshotLoading(false);
      });

    return () => {
      snapCtrl.abort();
      insightAbortRef.current?.abort();
    };
    // Locale is intentionally not in deps — the dedicated locale-change effect
    // below re-fetches the insight without re-fetching the snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // Re-fetch only the insight when locale changes (snapshot is locale-agnostic).
  // Skips the very first render where snapshot is null.
  useEffect(() => {
    if (!snapshot) return;
    const insCtrl = new AbortController();
    insightAbortRef.current?.abort();
    insightAbortRef.current = insCtrl;
    setInsight(null);
    setInsightError(null);
    setInsightLoading(true);
    fetchInsight(snapshot, locale, insCtrl.signal)
      .then((ins) => {
        if (insCtrl.signal.aborted) return;
        setInsight(ins);
        setInsightLoading(false);
      })
      .catch((err: unknown) => {
        if (insCtrl.signal.aborted) return;
        console.warn("[insight] failed", err);
        setInsightError(err instanceof Error ? err.message : "Unknown error");
        setInsightLoading(false);
      });
    return () => insCtrl.abort();
    // snapshot is intentionally omitted — the region effect handles the
    // snapshot-changed case. This effect only fires on locale flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Earthquake auto-refresh: poll /api/earthquake every 90 s while the tab is
  // visible. setInterval is used (not chained setTimeouts) so a single skipped
  // tick — e.g. the tab was backgrounded — can never break the chain. The
  // server caches autogempa for 60 s, so we burn at most ~1 upstream BMKG
  // request per 90 s of foreground time per server instance.
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const POLL_MS = 90_000;
    // Debounce so visibility-resume → near-immediate interval tick can't
    // double-fetch within the same window.
    const MIN_GAP_MS = 60_000;
    let cancelled = false;
    let ctrl: AbortController | null = null;
    let lastFetchAt = 0;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastFetchAt < MIN_GAP_MS) return;
      lastFetchAt = Date.now();
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const res = await fetchEarthquake(ctrl.signal);
        if (cancelled) return;
        setSnapshot((prev) => {
          if (!prev) return prev;
          if (
            prev.earthquake?.datetime === res.earthquake?.datetime &&
            prev.earthquake?.magnitude === res.earthquake?.magnitude
          ) {
            return prev;
          }
          return { ...prev, earthquake: res.earthquake };
        });
        setEarthquakeCheckedAt(res.checkedAt);
      } catch (err) {
        if (ctrl?.signal.aborted) return;
        console.warn("[earthquake] poll failed", err);
        // Reset debounce so the next interval tick or visibility-resume can retry.
        lastFetchAt = 0;
      }
    };

    const interval = setInterval(tick, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Refresh immediately when the tab is re-focused (if outside the debounce window).
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      ctrl?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mounted]);

  const onMapPick = useCallback(async (lat: number, lon: number) => {
    setMapResolving(true);
    try {
      const resolved = await resolveByCoordinates(lat, lon);
      if (!resolved) {
        console.warn("[map-pick] resolver returned null");
        return;
      }
      setRegion((prev) => {
        if (prev && prev.villageId === resolved.villageCode) return prev;
        return {
          provinceId: resolved.provinceCode,
          regencyId: resolved.regencyCode,
          districtId: resolved.districtCode,
          villageId: resolved.villageCode,
          provinceName: resolved.provinceName,
          regencyName: resolved.regencyName,
          districtName: resolved.districtName,
          villageName: resolved.villageName,
        };
      });
    } catch (err) {
      console.warn("[map-pick] failed", err);
    } finally {
      setMapResolving(false);
    }
  }, []);

  const onRegionChange = useCallback((next: RegionResolved) => {
    setRegion((prev) => {
      if (
        prev &&
        prev.provinceId === next.provinceId &&
        prev.regencyId === next.regencyId &&
        prev.districtId === next.districtId &&
        prev.villageId === next.villageId
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const regionLabel = useMemo(() => {
    if (!region) return t("insight.regionPlaceholder");
    return `${region.villageName}, ${region.districtName}, ${region.regencyName}, ${region.provinceName}`;
  }, [region, t]);

  const live = snapshot !== null && !snapshotLoading;

  if (!mounted) {
    return (
      <>
        <div className="h-[72px] border-b border-riksit-border/50" />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
          <div className="glass-strong p-6">
            <div className="skeleton h-4 w-40 mb-4" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-11/12" />
          </div>
        </main>
      </>
    );
  }

  return (
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      <Header live={live} regionLabel={region ? regionLabel : undefined} />

      {(snapshot?.warnings.length ?? 0) > 0 ? (
        <div className="px-3 sm:px-4 pt-3 lg:pt-2 shrink-0">
          <WarningBanner warnings={snapshot?.warnings ?? []} />
        </div>
      ) : null}

      {/* ─── DESKTOP (lg+): map fills the canvas; insight + selectors + data
            cards float on top as overlays, like Nemesis. ─── */}
      {isDesktop ? (
        <main className="flex-1 min-h-0 relative p-3">
          {snapshotError ? (
            <div
              role="alert"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[1300] glass border-riksit-danger/40 p-2 text-xs text-riksit-danger max-w-md"
            >
              {t("app.dataErrorShort")}: {snapshotError}
            </div>
          ) : null}

          {/* Full-bleed map */}
          <MapPanel
            variant="bare"
            snapshot={snapshot}
            loading={snapshotLoading}
            onPick={onMapPick}
            resolving={mapResolving}
          />

          {/* Floating top bar: region selectors. */}
          <div
            className="
            pointer-events-none absolute z-[1200]
            top-3 left-12 right-3
            flex justify-center
          "
          >
            <div className="pointer-events-auto glass-strong neon-border px-3 py-1.5 max-w-[720px] w-full">
              <RegionSelector
                initial={initialRegion}
                selected={region ?? undefined}
                onChange={onRegionChange}
              />
            </div>
          </div>

          {/* Floating LEFT: AI Insight panel — fills below selector to footer */}
          <div
            className="
            pointer-events-none absolute z-[1100]
            top-24 left-3 bottom-3
            w-[420px]
          "
          >
            <div className="pointer-events-auto h-full">
              <InsightCard
                insight={insight}
                loading={insightLoading || (snapshotLoading && !insight)}
                error={insightError}
                regionLabel={regionLabel}
              />
            </div>
          </div>

          {/* Floating RIGHT: 4 cards split into equal vertical slots — no scroll. */}
          <div
            className="
            pointer-events-none absolute z-[1100]
            top-5 right-3 bottom-10
            w-[280px]
            flex flex-col gap-2
          "
          >
            <div className="pointer-events-auto flex-1 min-h-0">
              <WeatherCard weather={snapshot?.weather ?? null} loading={snapshotLoading} />
            </div>
            <div className="pointer-events-auto flex-1 min-h-0">
              <ForecastCard forecast={snapshot?.forecast ?? []} loading={snapshotLoading} />
            </div>
            <div className="pointer-events-auto flex-1 min-h-0">
              <AirQualityCard airQuality={snapshot?.airQuality ?? null} loading={snapshotLoading} />
            </div>
            <div className="pointer-events-auto flex-1 min-h-0">
              <EarthquakeCard
                earthquake={snapshot?.earthquake ?? null}
                loading={snapshotLoading}
                lastChecked={earthquakeCheckedAt}
              />
            </div>
          </div>
        </main>
      ) : (
        /* ─── MOBILE (<lg): vertical stack. Map is a sized panel, selectors
            live with it; insight + cards follow below as you scroll. ─── */
        <main className="flex-1 min-h-0 px-3 py-3 flex flex-col gap-3">
          {snapshotError ? (
            <div
              role="alert"
              className="glass border-riksit-danger/40 p-3 text-sm text-riksit-danger"
            >
              {t("app.dataError")}: {snapshotError}
            </div>
          ) : null}

          <div className="h-[55vh] min-h-[360px] shrink-0">
            <MapPanel
              variant="withSelector"
              snapshot={snapshot}
              loading={snapshotLoading}
              onPick={onMapPick}
              resolving={mapResolving}
              initial={initialRegion}
              selected={region ?? undefined}
              onRegion={onRegionChange}
            />
          </div>

          <InsightCard
            insight={insight}
            loading={insightLoading || (snapshotLoading && !insight)}
            error={insightError}
            regionLabel={regionLabel}
          />

          <div className="grid grid-cols-2 gap-3">
            <WeatherCard weather={snapshot?.weather ?? null} loading={snapshotLoading} />
            <ForecastCard forecast={snapshot?.forecast ?? []} loading={snapshotLoading} />
            <AirQualityCard airQuality={snapshot?.airQuality ?? null} loading={snapshotLoading} />
            <EarthquakeCard
              earthquake={snapshot?.earthquake ?? null}
              loading={snapshotLoading}
              lastChecked={earthquakeCheckedAt}
            />
          </div>
        </main>
      )}

      <Footer />

      <DisclaimerModal />
    </div>
  );
}
