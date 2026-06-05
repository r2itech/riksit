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
import SpottedInfoCard, { type RegionNames } from "./SpottedInfoCard";
import LiveFeedCard from "./LiveFeedCard";
import ReportModal from "./ReportModal";
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
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("p", region.provinceId);
      params.set("r", region.regencyId);
      params.set("d", region.districtId);
      params.set("v", region.villageId);
      const next = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", next);
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const POLL_MS = 90_000;
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
        lastFetchAt = 0;
      }
    };

    const interval = setInterval(tick, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
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

  // Lowercased region names — passed to anything that filters Supabase rows.
  const regionNames = useMemo<RegionNames | null>(() => {
    if (!region) return null;
    return {
      province: region.provinceName.toLowerCase(),
      regency: region.regencyName.toLowerCase(),
      district: region.districtName.toLowerCase(),
      village: region.villageName.toLowerCase(),
    };
  }, [region]);

  const live = snapshot !== null && !snapshotLoading;

  const openReport = useCallback(() => setReportOpen(true), []);
  const closeReport = useCallback(() => setReportOpen(false), []);
  const onReportSuccess = useCallback(() => {
    setToast(t("report.successToast"));
  }, [t]);

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

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

  const reportDefaultRegion = region
    ? {
        provinceId: region.provinceId,
        regencyId: region.regencyId,
        districtId: region.districtId,
        villageId: region.villageId,
      }
    : undefined;

  return (
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      <Header live={live} regionLabel={region ? regionLabel : undefined} />

      {(snapshot?.warnings.length ?? 0) > 0 ? (
        <div className="px-3 sm:px-4 pt-3 lg:pt-2 shrink-0">
          <WarningBanner warnings={snapshot?.warnings ?? []} />
        </div>
      ) : null}

      {isDesktop ? (
        <DesktopLayout
          snapshot={snapshot}
          snapshotLoading={snapshotLoading}
          snapshotError={snapshotError}
          insight={insight}
          insightLoading={insightLoading}
          insightError={insightError}
          regionLabel={regionLabel}
          initialRegion={initialRegion}
          region={region}
          regionNames={regionNames}
          earthquakeCheckedAt={earthquakeCheckedAt}
          onMapPick={onMapPick}
          mapResolving={mapResolving}
          onRegionChange={onRegionChange}
          onOpenReport={openReport}
          t={t}
        />
      ) : (
        <MobileLayout
          snapshot={snapshot}
          snapshotLoading={snapshotLoading}
          snapshotError={snapshotError}
          insight={insight}
          insightLoading={insightLoading}
          insightError={insightError}
          regionLabel={regionLabel}
          initialRegion={initialRegion}
          region={region}
          regionNames={regionNames}
          earthquakeCheckedAt={earthquakeCheckedAt}
          onMapPick={onMapPick}
          mapResolving={mapResolving}
          onRegionChange={onRegionChange}
          onOpenReport={openReport}
          t={t}
        />
      )}

      <Footer />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1900] glass-strong neon-border px-4 py-2 text-sm text-riksit-neon animate-fade-in"
        >
          {toast}
        </div>
      ) : null}

      <ReportModal
        open={reportOpen}
        onClose={closeReport}
        onSuccess={onReportSuccess}
        defaultRegion={reportDefaultRegion}
      />

      <DisclaimerModal />
    </div>
  );
}

interface LayoutProps {
  snapshot: EnvironmentalSnapshot | null;
  snapshotLoading: boolean;
  snapshotError: string | null;
  insight: InsightPayload | null;
  insightLoading: boolean;
  insightError: string | null;
  regionLabel: string;
  initialRegion: Partial<RegionIds> | undefined;
  region: RegionResolved | null;
  regionNames: RegionNames | null;
  earthquakeCheckedAt: string | null;
  onMapPick: (lat: number, lon: number) => void;
  mapResolving: boolean;
  onRegionChange: (next: RegionResolved) => void;
  onOpenReport: () => void;
  t: ReturnType<typeof useLocale>["t"];
}

function DesktopLayout(props: LayoutProps) {
  const {
    snapshot,
    snapshotLoading,
    snapshotError,
    insight,
    insightLoading,
    insightError,
    regionLabel,
    initialRegion,
    region,
    regionNames,
    earthquakeCheckedAt,
    onMapPick,
    mapResolving,
    onRegionChange,
    onOpenReport,
    t,
  } = props;

  // Hide the spotted slot when there are no active items so the four data
  // cards expand to fill the top row.
  const [hasSpotted, setHasSpotted] = useState(false);
  const onSpottedCount = useCallback((n: number) => setHasSpotted(n > 0), []);

  return (
    <main className="flex-1 min-h-0 relative p-3">
      {snapshotError ? (
        <div
          role="alert"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1300] glass border-riksit-danger/40 p-2 text-xs text-riksit-danger max-w-md"
        >
          {t("app.dataErrorShort")}: {snapshotError}
        </div>
      ) : null}

      <MapPanel
        variant="bare"
        snapshot={snapshot}
        loading={snapshotLoading}
        onPick={onMapPick}
        resolving={mapResolving}
      />

      {/*
        Layout grid (desktop). All overlays share the same edge offsets and
        a consistent gap, scaled across lg / xl / 2xl. The diagram below
        shows the numbers used everywhere below — if you tweak a side-panel
        width, update the selector offsets in the same step so they stay
        flush with the panels.

           top:    top-3 (12)
           ┌────────────────────────────────────────────────────────────┐
           │           [ cards row — top-3, h-[145px] ]                 │  ← cards row band
           │           (full-width band, centered with max-w)           │
           ├──────────┬──────────────────────────────────────┬──────────┤
           │          │                                      │          │  ← 12 px gap
           │  AI      │                                      │  Live    │
           │  Insight │              MAP CANVAS              │  Feed    │  ← side-panel band
           │          │                                      │          │
           │ (left-3) │  ┌──────[ selector ]─────────┐       │ (right-3)│
           └──────────┘  └───────────────────────────┘       └──────────┘
                                                                  bottom: bottom-3 (12)

         Side-panel widths (lg / xl / 2xl):
           AI Insight: 300 / 340 / 380
           Live Feed : 280 / 320 / 360
         Side-panel band top  = 12 (top-3) + 145 (cards row) + 12 (gap) = 169 px
         Selector L offset    = 12 + AI_width + 12   (lg/xl/2xl: 324 / 364 / 404)
         Selector R offset    = 12 + Feed_width + 12 (lg/xl/2xl: 304 / 344 / 384)
      */}

      {/* Top row: cards row. Spans the full inner width, centered with a
          max-w that grows on larger screens so the cards don't shrink at
          ≥2xl viewports. SpottedInfo joins as a 5th column when active;
          its slot is `hidden` (still mounted) otherwise. */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-[1200] flex justify-center">
        <div
          className={`grid w-full gap-2 ${
            hasSpotted
              ? "grid-cols-5 max-w-[1120px] xl:max-w-[1280px] 2xl:max-w-[1480px]"
              : "grid-cols-4 max-w-[1080px] xl:max-w-[1200px] 2xl:max-w-[1400px]"
          }`}
          style={{ height: "145px" }}
        >
          <div className={`pointer-events-auto min-h-0 min-w-0 ${hasSpotted ? "" : "hidden"}`}>
            <SpottedInfoCard
              region={regionNames}
              variant="card"
              onActiveCountChange={onSpottedCount}
            />
          </div>
          <div className="pointer-events-auto min-h-0 min-w-0">
            <WeatherCard weather={snapshot?.weather ?? null} loading={snapshotLoading} />
          </div>
          <div className="pointer-events-auto min-h-0 min-w-0">
            <ForecastCard forecast={snapshot?.forecast ?? []} loading={snapshotLoading} />
          </div>
          <div className="pointer-events-auto min-h-0 min-w-0">
            <AirQualityCard airQuality={snapshot?.airQuality ?? null} loading={snapshotLoading} />
          </div>
          <div className="pointer-events-auto min-h-0 min-w-0">
            <EarthquakeCard
              earthquake={snapshot?.earthquake ?? null}
              loading={snapshotLoading}
              lastChecked={earthquakeCheckedAt}
            />
          </div>
        </div>
      </div>

      {/* Left column: AI Insight — starts BELOW the cards row with a small
          breathing gap. Both side panels share the same top offset so they
          align with each other instead of stair-stepping. */}
      <div className="pointer-events-none absolute z-[1100] top-[169px] left-3 bottom-7 w-[300px] xl:w-[340px] 2xl:w-[380px]">
        <div className="pointer-events-auto h-full">
          <InsightCard
            insight={insight}
            loading={insightLoading || (snapshotLoading && !insight)}
            error={insightError}
            regionLabel={regionLabel}
          />
        </div>
      </div>

      {/* Right column: Live Feed — mirrors AI Insight's vertical band. */}
      <div className="pointer-events-none absolute z-[1100] top-[169px] right-3 bottom-7 w-[280px] xl:w-[320px] 2xl:w-[360px]">
        <div className="pointer-events-auto h-full">
          <LiveFeedCard onReport={onOpenReport} />
        </div>
      </div>

      {/* Center bottom: RegionSelector — sits in the gap between the two
          side panels. L/R offsets track the side-panel widths so the
          selector is always flush against (not under) the panels. */}
      <div className="pointer-events-none absolute z-[1100] bottom-3 left-[324px] right-[304px] xl:left-[364px] xl:right-[344px] 2xl:left-[404px] 2xl:right-[384px] flex justify-center">
        <div className="pointer-events-auto glass-strong neon-border w-full max-w-[720px] px-3 py-1.5">
          <RegionSelector
            initial={initialRegion}
            selected={region ?? undefined}
            onChange={onRegionChange}
          />
        </div>
      </div>
    </main>
  );
}

function MobileLayout(props: LayoutProps) {
  const {
    snapshot,
    snapshotLoading,
    snapshotError,
    insight,
    insightLoading,
    insightError,
    regionLabel,
    initialRegion,
    region,
    regionNames,
    earthquakeCheckedAt,
    onMapPick,
    mapResolving,
    onRegionChange,
    onOpenReport,
    t,
  } = props;
  return (
    // Padding + gap grow slightly at `sm:` (≥640 px — typical phone landscape
    // and small tablets) so the stack doesn't feel cramped at larger mobile
    // widths while staying compact on small phones (~360 px).
    <main className="flex-1 min-h-0 flex flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
      <SpottedInfoCard region={regionNames} variant="banner" />

      {snapshotError ? (
        <div role="alert" className="glass border-riksit-danger/40 p-3 text-sm text-riksit-danger">
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <WeatherCard weather={snapshot?.weather ?? null} loading={snapshotLoading} />
        <ForecastCard forecast={snapshot?.forecast ?? []} loading={snapshotLoading} />
        <AirQualityCard airQuality={snapshot?.airQuality ?? null} loading={snapshotLoading} />
        <EarthquakeCard
          earthquake={snapshot?.earthquake ?? null}
          loading={snapshotLoading}
          lastChecked={earthquakeCheckedAt}
        />
      </div>

      <InsightCard
        insight={insight}
        loading={insightLoading || (snapshotLoading && !insight)}
        error={insightError}
        regionLabel={regionLabel}
      />

      <div className="h-[60vh] min-h-[320px]">
        <LiveFeedCard onReport={onOpenReport} />
      </div>
    </main>
  );
}
