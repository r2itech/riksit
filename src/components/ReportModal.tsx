"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale } from "./LocaleProvider";
import SearchableSelect from "./SearchableSelect";
import { getDistricts, getProvinces, getRegencies, getVillages } from "@/lib/region-api";
import type { District, Province, Regency, Village } from "@/lib/types";

interface DefaultRegion {
  provinceId: string;
  regencyId: string;
  districtId: string;
  villageId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultRegion?: DefaultRegion;
}

const MAX_MESSAGE = 500;
const MAX_USERNAME = 80;

function ReportModal({ open, onClose, onSuccess, defaultRegion }: Props) {
  const { t } = useLocale();
  const labelId = useId();

  // Form state.
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [provinceCode, setProvinceCode] = useState(defaultRegion?.provinceId ?? "");
  const [regencyCode, setRegencyCode] = useState(defaultRegion?.regencyId ?? "");
  const [districtCode, setDistrictCode] = useState(defaultRegion?.districtId ?? "");
  const [villageCode, setVillageCode] = useState(defaultRegion?.villageId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cascading lists.
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  // Reset to defaultRegion whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setUsername("");
    setMessage("");
    setError(null);
    setSubmitting(false);
    setProvinceCode(defaultRegion?.provinceId ?? "");
    setRegencyCode(defaultRegion?.regencyId ?? "");
    setDistrictCode(defaultRegion?.districtId ?? "");
    setVillageCode(defaultRegion?.villageId ?? "");
  }, [open, defaultRegion]);

  // Load provinces.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getProvinces()
      .then((list) => {
        if (!cancelled) setProvinces(list);
      })
      .catch((e) => console.warn("[report-modal] provinces", e));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!provinceCode) {
      setRegencies([]);
      return;
    }
    let cancelled = false;
    getRegencies(provinceCode)
      .then((list) => {
        if (!cancelled) setRegencies(list);
      })
      .catch((e) => console.warn("[report-modal] regencies", e));
    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  useEffect(() => {
    if (!regencyCode) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    getDistricts(regencyCode)
      .then((list) => {
        if (!cancelled) setDistricts(list);
      })
      .catch((e) => console.warn("[report-modal] districts", e));
    return () => {
      cancelled = true;
    };
  }, [regencyCode]);

  useEffect(() => {
    if (!districtCode) {
      setVillages([]);
      return;
    }
    let cancelled = false;
    getVillages(districtCode)
      .then((list) => {
        if (!cancelled) setVillages(list);
      })
      .catch((e) => console.warn("[report-modal] villages", e));
    return () => {
      cancelled = true;
    };
  }, [districtCode]);

  // Focus trap + Esc + page scroll lock. We lock BOTH <html> and <body>
  // because some browsers (Safari, certain Android Chrome versions) still
  // surface a page scrollbar through the backdrop if only `body.overflow`
  // is set — that scrollbar reads as a "scroll outside the card".
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    // Defer focus so the input is mounted.
    const t1 = window.setTimeout(() => firstFieldRef.current?.focus(), 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && containerRef.current) {
        const focusables = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t1);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const remaining = MAX_MESSAGE - message.length;

  const selected = useMemo(
    () => ({
      province: provinces.find((p) => p.code === provinceCode) ?? null,
      regency: regencies.find((r) => r.code === regencyCode) ?? null,
      district: districts.find((d) => d.code === districtCode) ?? null,
      village: villages.find((v) => v.code === villageCode) ?? null,
    }),
    [
      provinces,
      regencies,
      districts,
      villages,
      provinceCode,
      regencyCode,
      districtCode,
      villageCode,
    ],
  );

  const handleProvinceChange = useCallback((code: string) => {
    setProvinceCode(code);
    setRegencyCode("");
    setDistrictCode("");
    setVillageCode("");
  }, []);
  const handleRegencyChange = useCallback((code: string) => {
    setRegencyCode(code);
    setDistrictCode("");
    setVillageCode("");
  }, []);
  const handleDistrictChange = useCallback((code: string) => {
    setDistrictCode(code);
    setVillageCode("");
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const u = username.trim();
      const m = message.trim();
      if (
        !u ||
        !m ||
        !selected.province ||
        !selected.regency ||
        !selected.district ||
        !selected.village
      ) {
        setError(t("report.validationRequired"));
        return;
      }
      if (m.length > MAX_MESSAGE) {
        setError(t("report.validationMaxChars"));
        return;
      }
      if (u.length > MAX_USERNAME) {
        setError(t("report.validationRequired"));
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch(`/api/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: u,
            message: m,
            province_name: selected.province.name.toLowerCase(),
            regency_name: selected.regency.name.toLowerCase(),
            district_name: selected.district.name.toLowerCase(),
            village_name: selected.village.name.toLowerCase(),
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        setSubmitting(false);
        onSuccess?.();
        onClose();
      } catch (err) {
        console.warn("[report-modal] submit failed", err);
        setSubmitting(false);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [username, message, selected, t, onClose, onSuccess],
  );

  if (!open) return null;

  return (
    // Outer dialog: full viewport, flex-centered, `overflow-hidden` so no
    // scrollbar can ever appear on the backdrop itself.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4 overflow-hidden"
      onMouseDown={(e) => {
        // Only close when the backdrop itself is clicked, not when a click
        // started inside the modal and the mouse drifted outside on release.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/*
        Card structure (flex column, fixed max-h):
          ┌────────────────────────────────────┐
          │ header (shrink-0)                  │ ← never scrolls
          ├────────────────────────────────────┤
          │ form fields (flex-1, scrolls)      │ ← the ONLY scroll area
          ├────────────────────────────────────┤
          │ action buttons (shrink-0)          │ ← never scrolls
          └────────────────────────────────────┘
        The card itself is `overflow-hidden` and constrained to
        `100dvh − 2rem` (the dialog's `p-4` padding), so the scrollbar can
        only ever appear *inside* the fields region — not on the card edge
        and not on the backdrop.
      */}
      <div
        ref={containerRef}
        className="glass-strong neon-border relative flex flex-col w-full max-w-md max-h-[calc(100dvh-2rem)] rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 shrink-0">
          <h2
            id={labelId}
            className="text-base sm:text-lg font-semibold tracking-wide text-riksit-ink uppercase"
          >
            {t("report.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("report.close")}
            className="w-7 h-7 rounded-full grid place-items-center text-riksit-muted hover:text-riksit-ink hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable fields region. `overscroll-contain` stops a scroll
              gesture inside the form from chaining to the page underneath
              when the user reaches the top/bottom of the list. */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain riksit-thin-scroll px-5 sm:px-6 py-3 space-y-4">
            <label className="block">
              <span className="text-[11px] font-mono uppercase tracking-wider text-riksit-muted">
                {t("report.fieldUsername")}
              </span>
              <input
                ref={firstFieldRef}
                type="text"
                required
                maxLength={MAX_USERNAME}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="riksit-select w-full mt-1"
                autoComplete="off"
              />
            </label>

            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-riksit-muted">
                {t("report.fieldLocation")}
              </span>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <SearchableSelect
                  value={provinceCode}
                  options={provinces}
                  placeholder={t("region.placeholder.province")}
                  ariaLabel={t("region.aria.province")}
                  title={t("region.title.province")}
                  onChange={handleProvinceChange}
                />
                <SearchableSelect
                  value={regencyCode}
                  options={regencies}
                  placeholder={t("region.placeholder.regency")}
                  ariaLabel={t("region.aria.regency")}
                  title={t("region.title.regency")}
                  onChange={handleRegencyChange}
                  disabled={!provinceCode || regencies.length === 0}
                />
                <SearchableSelect
                  value={districtCode}
                  options={districts}
                  placeholder={t("region.placeholder.district")}
                  ariaLabel={t("region.aria.district")}
                  title={t("region.title.district")}
                  onChange={handleDistrictChange}
                  disabled={!regencyCode || districts.length === 0}
                />
                <SearchableSelect
                  value={villageCode}
                  options={villages}
                  placeholder={t("region.placeholder.village")}
                  ariaLabel={t("region.aria.village")}
                  title={t("region.title.village")}
                  onChange={setVillageCode}
                  disabled={!districtCode || villages.length === 0}
                />
              </div>
            </div>

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-riksit-muted">
                  {t("report.fieldMessage")}
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    remaining < 0 ? "text-riksit-danger" : "text-riksit-muted"
                  }`}
                >
                  {t("report.charCount", { n: message.length })}
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="riksit-select w-full mt-1 resize-y"
                style={{ minHeight: "5rem" }}
              />
            </label>

            {error ? (
              <p role="alert" className="text-xs text-riksit-danger">
                {t("report.errorPrefix")}: {error}
              </p>
            ) : null}
          </div>

          {/* Sticky-at-card-bottom action row. `border-t` + a slight panel
              tint makes the separation between the scroll area and the
              static footer visible without being heavy. */}
          <div className="flex items-center justify-end gap-2 px-5 sm:px-6 pt-3 pb-5 sm:pb-6 shrink-0 border-t border-riksit-border/40 bg-riksit-panel/40">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-2 text-[12px] font-mono uppercase tracking-wider text-riksit-muted hover:text-riksit-ink transition-colors disabled:opacity-50"
            >
              {t("report.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-riksit-neon/20 hover:bg-riksit-neon/30 text-riksit-neon ring-1 ring-riksit-neon/50 font-semibold tracking-wide text-[12px] uppercase transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? t("report.submitting") : t("report.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// The parent (RiksitApp) re-renders every 90 s when the earthquake poll
// flips `snapshot`, and rebuilds `defaultRegion` as a fresh object literal
// on each render. Default `memo` does a shallow compare and would still
// see that fresh object as "changed", which would re-run the reset effect
// inside ReportModal and wipe the user's half-typed form. Compare
// `defaultRegion` by its four ID fields instead so identity churn from
// upstream re-renders doesn't reach the form. Functions are compared by
// reference — callers MUST keep `onClose` / `onSuccess` stable
// (`useCallback`), otherwise the same reset would happen.
function arePropsEqual(prev: Props, next: Props): boolean {
  if (prev.open !== next.open) return false;
  if (prev.onClose !== next.onClose) return false;
  if (prev.onSuccess !== next.onSuccess) return false;
  const p = prev.defaultRegion;
  const n = next.defaultRegion;
  if (p === n) return true;
  if (!p || !n) return false;
  return (
    p.provinceId === n.provinceId &&
    p.regencyId === n.regencyId &&
    p.districtId === n.districtId &&
    p.villageId === n.villageId
  );
}

export default memo(ReportModal, arePropsEqual);
