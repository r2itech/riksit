// Server-side helper that fetches the latest community reports for the given
// region and turns them into an extra prompt section. Imported by the insight
// route. Failures are swallowed — the insight should still be generated even
// if Supabase is unreachable.

import { isSupabaseConfigured, regionOrFilter, supabaseServerFetch } from "./supabase-server";
import type { Locale } from "./i18n";
import type { EnvironmentalSnapshot } from "./types";

export interface ReportContextRow {
  username: string;
  message: string;
  is_ai: boolean;
  province_name: string | null;
  regency_name: string | null;
  district_name: string | null;
  village_name: string | null;
  created_at: string;
}

const LIMIT = 10;

/**
 * Fetch up to 10 most recent reports for the snapshot's region. Returns an
 * empty array on any error — callers must never let this block insight
 * generation.
 */
export async function fetchReportsForRegion(
  snapshot: EnvironmentalSnapshot,
): Promise<ReportContextRow[]> {
  if (!isSupabaseConfigured()) return [];
  const r = snapshot.region;
  const orClause = regionOrFilter({
    province: r.provinceName,
    regency: r.regencyName,
    district: r.districtName,
    village: r.villageName,
  });
  if (!orClause) return [];
  const qs = `${orClause}&order=created_at.desc&limit=${LIMIT}`;
  try {
    const rows = await supabaseServerFetch<ReportContextRow[]>(`reports?${qs}`, {
      timeoutMs: 5000,
    });
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn("[insight-context] supabase reports fetch failed", err);
    return [];
  }
}

/**
 * Build the "Laporan Terkini" / "Recent Community & AI Reports" block to
 * append to the AI prompt. Returns an empty string when there are no
 * reports — callers concatenate it as-is.
 */
export function buildReportsContextBlock(rows: ReportContextRow[], locale: Locale): string {
  if (rows.length === 0) return "";
  const header =
    locale === "en-US"
      ? "Recent reports from the community & AI Monitor:"
      : "Laporan Terkini dari Masyarakat & AI Monitor:";
  const lines = rows.map((r) => {
    const location = r.village_name || r.district_name || r.regency_name || r.province_name || "-";
    const name = r.is_ai ? "Riksit Agent" : r.username || "anon";
    // Avoid embedding raw newlines from the message — collapse them.
    const message = (r.message ?? "").replace(/\s+/g, " ").trim();
    return `[${name}] di ${location}: ${message}`;
  });
  return `\n\n${header}\n${lines.join("\n")}`;
}
