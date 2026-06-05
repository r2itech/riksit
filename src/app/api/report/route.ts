import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServerFetch } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/report — anonymous community report.
// Body: { username, message, province_name, regency_name, district_name, village_name }
// All location names are lowercased server-side before insert; is_ai is forced
// to false so the route cannot be used to impersonate the AI monitor source.

const MAX_MESSAGE = 500;
const MAX_USERNAME = 80;

interface IncomingReport {
  username?: unknown;
  message?: unknown;
  province_name?: unknown;
  regency_name?: unknown;
  district_name?: unknown;
  village_name?: unknown;
}

function asTrimmedString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Reporting is not configured." }, { status: 503 });
  }

  let body: IncomingReport;
  try {
    body = (await req.json()) as IncomingReport;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const username = asTrimmedString(body.username, MAX_USERNAME);
  const message = asTrimmedString(body.message, MAX_MESSAGE);
  const province = asTrimmedString(body.province_name, 120);
  const regency = asTrimmedString(body.regency_name, 120);
  const district = asTrimmedString(body.district_name, 120);
  const village = asTrimmedString(body.village_name, 120);

  if (!username || !message || !province || !regency || !district || !village) {
    return NextResponse.json(
      { error: "All fields are required and must respect length limits." },
      { status: 400 },
    );
  }

  const insertRow = {
    username,
    message,
    is_ai: false,
    province_name: province.toLowerCase(),
    regency_name: regency.toLowerCase(),
    district_name: district.toLowerCase(),
    village_name: village.toLowerCase(),
  };

  try {
    const inserted = await supabaseServerFetch<unknown[]>(`reports`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(insertRow),
      timeoutMs: 7000,
    });
    return NextResponse.json(Array.isArray(inserted) ? inserted[0] : inserted, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.warn("[api/report] supabase insert failed", err);
    return NextResponse.json({ error: "Failed to submit report." }, { status: 502 });
  }
}
