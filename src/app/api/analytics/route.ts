import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServerFetch } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/analytics — anonymous per-region page-load counter.
// Body: { province_name, regency_name, district_name, village_name }
// Region names are normalized (lowercase + whitespace → underscore) before
// insert so aggregation joins survive punctuation and casing drift. Errors
// never surface to the caller — this is a fire-and-forget tracker.

const MAX_LEN = 120;

interface IncomingAnalytics {
  province_name?: unknown;
  regency_name?: unknown;
  district_name?: unknown;
  village_name?: unknown;
}

function normalize(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed || trimmed.length > MAX_LEN) return null;
  return trimmed.toLowerCase().replace(/\s+/g, "_");
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  let body: IncomingAnalytics;
  try {
    body = (await req.json()) as IncomingAnalytics;
  } catch {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const province = normalize(body.province_name);
  const regency = normalize(body.regency_name);
  const district = normalize(body.district_name);
  const village = normalize(body.village_name);

  if (!province || !regency || !district || !village) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const insertRow = {
    province_name: province,
    regency_name: regency,
    district_name: district,
    village_name: village,
  };

  try {
    await supabaseServerFetch<unknown>(`analytics`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(insertRow),
      timeoutMs: 5000,
    });
  } catch (err) {
    console.warn("[api/analytics] supabase insert failed", err);
  }

  return NextResponse.json(
    { ok: true },
    {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
