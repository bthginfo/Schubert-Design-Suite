import { createHash } from "node:crypto";
import { getCache } from "@vercel/functions";

const ttl = 60 * 60;
const maximumEntries = 96;
const entries = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();

export async function cachePublicCatalog<T>(key: string, load: () => Promise<T>, shareIndex = false): Promise<T> {
  const current = entries.get(key);
  if (current && current.expires > Date.now()) return current.value as T;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const promise = (async () => {
    const remote = shareIndex && process.env.VERCEL === "1"
      ? getCache({ namespace: "manufacturer-index-v1" })
      : undefined;
    const cacheKey = createHash("sha256").update(key).digest("hex");
    const cached = await remote?.get(cacheKey).catch(() => null) as T | null | undefined;
    const value = cached ?? await load();
    if (remote && cached == null) {
      await remote.set(cacheKey, value, { ttl, name: key }).catch(() => undefined);
    }
    if (entries.size >= maximumEntries) entries.delete(entries.keys().next().value!);
    entries.set(key, { expires: Date.now() + ttl * 1000, value });
    return value;
  })();
  pending.set(key, promise);
  try {
    return await promise;
  } finally {
    pending.delete(key);
  }
}
