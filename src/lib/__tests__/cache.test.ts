import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invalidate, withCache } from "@/lib/cache";

describe("withCache", () => {
  beforeEach(() => {
    invalidate();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    invalidate();
  });

  it("returns the loader's value on first call", async () => {
    const result = await withCache("k1", 60_000, async () => 42);
    expect(result).toBe(42);
  });

  it("returns the cached value within TTL without re-invoking the loader", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    await withCache("k2", 60_000, loader);
    await withCache("k2", 60_000, loader);
    await withCache("k2", 60_000, loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("re-invokes the loader after TTL expires", async () => {
    const loader = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("b");
    const first = await withCache("k3", 1_000, loader);
    expect(first).toBe("a");
    vi.advanceTimersByTime(1_001);
    const second = await withCache("k3", 1_000, loader);
    expect(second).toBe("b");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does NOT cache null results — next call re-invokes the loader", async () => {
    const loader = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce("ok");
    const first = await withCache("k4", 60_000, loader);
    expect(first).toBeNull();
    const second = await withCache("k4", 60_000, loader);
    expect(second).toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does NOT cache undefined results", async () => {
    const loader = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(7);
    await withCache("k5", 60_000, loader);
    const second = await withCache("k5", 60_000, loader);
    expect(second).toBe(7);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("isolates entries by key", async () => {
    const loaderA = vi.fn().mockResolvedValue("A");
    const loaderB = vi.fn().mockResolvedValue("B");
    expect(await withCache("kA", 60_000, loaderA)).toBe("A");
    expect(await withCache("kB", 60_000, loaderB)).toBe("B");
    expect(await withCache("kA", 60_000, loaderA)).toBe("A");
    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);
  });
});

describe("invalidate", () => {
  beforeEach(() => invalidate());

  it("clears everything when called with no prefix", async () => {
    const loader = vi.fn().mockResolvedValue("v");
    await withCache("p:a", 60_000, loader);
    await withCache("q:b", 60_000, loader);
    invalidate();
    await withCache("p:a", 60_000, loader);
    await withCache("q:b", 60_000, loader);
    expect(loader).toHaveBeenCalledTimes(4);
  });

  it("clears only keys matching the prefix", async () => {
    const loader = vi.fn().mockResolvedValue("v");
    await withCache("region:provinces", 60_000, loader);
    await withCache("bmkg:weather:xx", 60_000, loader);
    invalidate("region:");
    await withCache("region:provinces", 60_000, loader); // miss → re-invoke
    await withCache("bmkg:weather:xx", 60_000, loader); // hit → no re-invoke
    expect(loader).toHaveBeenCalledTimes(3);
  });
});
