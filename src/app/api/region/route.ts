import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { fetchJson } from "@/lib/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side proxy for wilayah.id. wilayah.id does not send CORS headers so
// the browser cannot fetch it directly; routing through our server side-steps
// CORS entirely and lets us cache the (effectively static) admin region data
// in memory for 24h.

const BASE = "https://wilayah.id/api";
const TTL = 24 * 60 * 60 * 1000;

type Kind = "provinces" | "regencies" | "districts" | "villages";
const KIND_PARENT_PATTERN: Record<Kind, RegExp | null> = {
  provinces: null, // no parent
  regencies: /^\d{2}$/,
  districts: /^\d{2}\.\d{2}$/,
  villages: /^\d{2}\.\d{2}\.\d{2}$/,
};

interface ListEnvelope<T> {
  data: T[];
}
interface Item {
  code: string;
  name: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") ?? "") as Kind;
  const parent = (url.searchParams.get("parent") ?? "").trim();

  if (!(kind in KIND_PARENT_PATTERN)) {
    return NextResponse.json(
      {
        error: "Parameter `kind` harus salah satu dari: provinces, regencies, districts, villages.",
      },
      { status: 400 },
    );
  }

  const expectedParent = KIND_PARENT_PATTERN[kind];
  if (expectedParent === null && parent !== "") {
    return NextResponse.json(
      { error: "Parameter `parent` tidak boleh diisi untuk `provinces`." },
      { status: 400 },
    );
  }
  if (expectedParent !== null && !expectedParent.test(parent)) {
    return NextResponse.json(
      { error: `Parameter \`parent\` tidak valid untuk \`${kind}\`.` },
      { status: 400 },
    );
  }

  const upstream =
    kind === "provinces" ? `${BASE}/provinces.json` : `${BASE}/${kind}/${parent}.json`;
  const cacheKey = `wilayah:${kind}:${parent}`;

  try {
    const data = await withCache(cacheKey, TTL, async () => {
      const env = await fetchJson<ListEnvelope<Item>>(upstream, { timeoutMs: 9000 });
      return Array.isArray(env?.data) ? env.data : [];
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.warn("[region-proxy] upstream failed", upstream, err);
    return NextResponse.json(
      { error: "Gagal mengambil data wilayah dari sumber upstream." },
      { status: 502 },
    );
  }
}
