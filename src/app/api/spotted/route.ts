import { NextResponse } from "next/server";
import { isSupabaseConfigured, regionOrFilter, supabaseServerFetch } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/spotted?province=&regency=&district=&village=
// Returns the active spotted_info rows whose region hierarchy matches at
// least one of the supplied names and whose expires_at is still in the
// future. Region name comparison is done case-insensitively on the Supabase
// side via the `regionOrFilter` builder.

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json([], { status: 200 });

  const url = new URL(req.url);
  const province = url.searchParams.get("province") ?? "";
  const regency = url.searchParams.get("regency") ?? "";
  const district = url.searchParams.get("district") ?? "";
  const village = url.searchParams.get("village") ?? "";

  const orClause = regionOrFilter({ province, regency, district, village });
  // No region given → return empty rather than dumping every active row.
  if (!orClause) return NextResponse.json([], { status: 200 });

  // expires_at > now(): PostgREST's `gt.now()` accepts the literal `now()` —
  // Supabase resolves it server-side. Order by created_at desc.
  const qs = `expires_at=gt.now()&${orClause}&order=created_at.desc`;

  try {
    const rows = await supabaseServerFetch<unknown[]>(`spotted_info?${qs}`, { timeoutMs: 7000 });
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.warn("[api/spotted] supabase failed", err);
    return NextResponse.json([], { status: 200 });
  }
}
