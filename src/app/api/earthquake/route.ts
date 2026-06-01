import { NextResponse } from "next/server";
import { getLatestEarthquake } from "@/lib/bmkg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Slim endpoint used by the client-side auto-refresh poll on the
// "Gempa Terbaru" card. Reuses the same in-memory cache as the snapshot route,
// so a poll arriving while the cache is fresh costs us zero upstream calls.
export async function GET() {
  const earthquake = await getLatestEarthquake();
  return NextResponse.json(
    { earthquake, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
