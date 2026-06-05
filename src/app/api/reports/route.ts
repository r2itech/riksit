import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServerFetch } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/reports
// Returns up to 20 most recent reports across every region — no location
// filter. Spotted Info is still region-filtered; this feed is intentionally
// global so users see country-wide activity in the Live Feed.

const LIMIT = 20;

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json([], { status: 200 });

  const qs = `order=created_at.desc&limit=${LIMIT}`;
  try {
    const rows = await supabaseServerFetch<unknown[]>(`reports?${qs}`, { timeoutMs: 7000 });
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.warn("[api/reports] supabase failed", err);
    return NextResponse.json([], { status: 200 });
  }
}
