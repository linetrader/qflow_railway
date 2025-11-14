// src/lib/fetchWithRetry.ts
"use client";

import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";

export function isAbortError(
  e: unknown
): e is DOMException | { name: "AbortError" } {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (typeof e === "object" && e !== null && "name" in e) {
    const n = (e as { name?: unknown }).name;
    return n === "AbortError";
  }
  return false;
}

/**
 * GET 전용 재시도 래퍼: 시도당 타임아웃 + Abort/504 지수 백오프
 */
export async function fetchWithRetry<T>(
  url: string,
  init: RequestInit,
  attempts = 3,
  perTryTimeoutMs = 15_000
): Promise<T> {
  let lastErr: unknown = null;

  for (let i = 0; i < attempts; i++) {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), perTryTimeoutMs);

    try {
      const json = await fetchJson<T>(url, { ...init, signal: ac.signal });
      clearTimeout(timeout);
      return json;
    } catch (e: unknown) {
      clearTimeout(timeout);
      lastErr = e;

      const msg = e instanceof Error ? e.message : "";
      const is504 = /HTTP_504|UPSTREAM_TIMEOUT/.test(msg);

      if ((isAbortError(e) || is504) && i < attempts - 1) {
        const backoff = 300 * Math.pow(2, i) + Math.floor(Math.random() * 200);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("UNKNOWN_ERROR");
}
