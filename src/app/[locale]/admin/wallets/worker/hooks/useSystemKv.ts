// src/app/admin/wallets/worker/hooks/useSystemKv.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import type {
  AllowedKey,
  ActiveKV,
  LoadKvResp,
  SaveKvResp,
} from "@/types/admin/wallets/worker";
import { isAbortError } from "@/app/[locale]/admin/lib/fetchWithRetry";

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message ?? "";
  if (typeof e === "object" && e !== null && "message" in e) {
    const maybe = (e as { message?: unknown }).message;
    if (typeof maybe === "string") return maybe;
  }
  return typeof e === "string" ? e : "UNKNOWN_ERROR";
}

export function useSystemKv() {
  const [allowed, setAllowed] = useState<AllowedKey[]>([
    "BSC_MAINNET",
    "BSC_TESTNET",
  ]);
  const [active, setActive] = useState<ActiveKV>({
    key: "BSC_MAINNET",
    value: "",
    updatedAt: "",
  });

  const [selected, setSelected] = useState<AllowedKey>("BSC_MAINNET");
  const [val, setVal] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upstreamCtrlRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    upstreamCtrlRef.current?.abort();
    const upstream = new AbortController();
    upstreamCtrlRef.current = upstream;

    setLoading(true);
    setError(null);

    try {
      const j = await fetchJson<LoadKvResp>(
        "/api/admin/wallets/worker/system-kv",
        {
          cache: "no-store",
          signal: upstream.signal,
        }
      );

      if (!j.ok) throw new Error(j.message ?? j.code ?? "LOAD_FAILED");

      setAllowed(j.allowed);
      setActive(j.active);
      setSelected(j.active.key ?? "BSC_MAINNET");
      setVal(j.active.value ?? "");
    } catch (e: unknown) {
      if (isAbortError(e)) return;
      const msg = toMessage(e);
      setError(
        /UPSTREAM_TIMEOUT|HTTP_504/.test(msg) ? "UPSTREAM_TIMEOUT" : msg
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => upstreamCtrlRef.current?.abort();
  }, [load]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const j = await fetchJson<SaveKvResp>(
        "/api/admin/wallets/worker/system-kv",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: selected, value: val }),
        }
      );
      if (!j.ok) throw new Error(j.message ?? j.code ?? "SAVE_FAILED");
      setActive(j.active);
      setSelected(j.active.key);
      setVal(j.active.value);
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setSaving(false);
    }
  }, [selected, val, saving]);

  return {
    state: { allowed, active, selected, val, loading, saving, error },
    actions: { setSelected, setVal, load, save },
  };
}
