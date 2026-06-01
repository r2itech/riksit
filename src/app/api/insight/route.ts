import { NextResponse } from "next/server";
import { generateInsight } from "@/lib/gemini";
import type { EnvironmentalSnapshot, InsightPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Insight cache lives at the route level so we can apply two different TTLs:
//   - Gemini-sourced insight: 10 min (matches the snapshot data cache window).
//   - Deterministic fallback: 2 min (so Gemini gets retried sooner once the
//     quota window recovers — we don't want to lock the user into a fallback
//     for 10 min after a single 429).
const GEMINI_TTL_MS = 10 * 60 * 1000;
const FALLBACK_TTL_MS = 2 * 60 * 1000;

interface CacheEntry {
  value: InsightPayload;
  expires: number;
}
const insightCache = new Map<string, CacheEntry>();

function cacheKey(snapshot: EnvironmentalSnapshot): string {
  // Lat/lon to 4 decimals (~11 m) is effectively unique per village.
  const { lat, lon } = snapshot.region;
  return `insight:${lat.toFixed(4)}:${lon.toFixed(4)}`;
}

export async function POST(req: Request) {
  let body: { snapshot?: EnvironmentalSnapshot };
  try {
    body = (await req.json()) as { snapshot?: EnvironmentalSnapshot };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const snapshot = body.snapshot;
  if (!snapshot || !snapshot.region) {
    return NextResponse.json({ error: "Missing snapshot payload." }, { status: 400 });
  }

  const key = cacheKey(snapshot);
  const now = Date.now();
  const hit = insightCache.get(key);
  if (hit && hit.expires > now) {
    return NextResponse.json(hit.value, {
      headers: { "Cache-Control": "no-store", "X-Insight-Cache": "hit" },
    });
  }

  const insight = await generateInsight(snapshot);
  const ttl = insight.source === "gemini" ? GEMINI_TTL_MS : FALLBACK_TTL_MS;
  insightCache.set(key, { value: insight, expires: now + ttl });

  return NextResponse.json(insight, {
    headers: { "Cache-Control": "no-store", "X-Insight-Cache": "miss" },
  });
}
