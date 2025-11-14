"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BulkPurchasePayload,
  BulkPurchaseResult,
  PackageBrief,
} from "@/types/admin/packages/user/packages-bulk";
import {
  isAbortError,
  isBulkPurchaseResult,
  isPackagesApiResp,
} from "../guards/packages-bulk";
import { useToast } from "@/components/ui";

/* ---------- helpers (순수) ---------- */
function parse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}
function toMsg(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}
export function parseIntU(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isInteger(n) ? n : undefined;
}
export function parseNumU(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
export function parseItemsCsv(
  csv: string
): { packageId: string; units: number }[] {
  return csv
    .split(",")
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg) => {
      const [pid, unitsStr] = seg.split(":");
      const units = Number((unitsStr ?? "1").trim());
      return {
        packageId: String(pid ?? "").trim(),
        units: Number.isFinite(units) && units > 0 ? units : 1,
      };
    })
    .filter((x) => x.packageId.length > 0);
}

/* ---------- hook ---------- */
export function useBulkPurchase() {
  const { toast } = useToast();

  // 패키지 목록
  const [pkLoading, setPkLoading] = useState<boolean>(false);
  const [pkError, setPkError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageBrief[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  // 실행 상태
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<BulkPurchaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCtrlRef = useRef<AbortController | null>(null);
  const submitCtrlRef = useRef<AbortController | null>(null);

  // 패키지 목록 로드
  const fetchPackages = useCallback(async () => {
    loadCtrlRef.current?.abort();
    const ac = new AbortController();
    loadCtrlRef.current = ac;

    setPkLoading(true);
    setPkError(null);
    try {
      const r = await fetch("/api/admin/packages?size=200&sort=name:asc", {
        method: "GET",
        cache: "no-store",
        signal: ac.signal,
      });
      const body = parse(await r.text());
      if (!r.ok) throw new Error(`HTTP_${r.status}`);
      if (!isPackagesApiResp(body)) throw new Error("INVALID_RESPONSE");
      setPackages(body.items);
      if (body.items.length > 0) {
        setSelectedPackageId((prev) => prev || body.items[0].id);
      }
    } catch (e) {
      if (isAbortError(e)) return;
      const msg = toMsg(e);
      setPkError(msg);
      toast({
        title: "패키지 목록 실패",
        description: msg,
        variant: "error",
      });
    } finally {
      setPkLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchPackages();
    return () => loadCtrlRef.current?.abort();
  }, [fetchPackages]);

  const pkSelectDisabled = useMemo<boolean>(
    () => pkLoading || !!pkError || packages.length === 0,
    [pkLoading, pkError, packages.length]
  );

  // 실행
  const submit = useCallback(
    async (formData: FormData) => {
      setError(null);
      setResult(null);
      setSubmitting(true);

      submitCtrlRef.current?.abort();
      const ac = new AbortController();
      submitCtrlRef.current = ac;
      const to = setTimeout(() => ac.abort(), 30_000);

      try {
        const prefix =
          String(formData.get("prefix") ?? "test").trim() || "test";
        const pad = parseIntU(formData.get("pad")) ?? 3;
        const start = parseIntU(formData.get("start"));
        const end = parseIntU(formData.get("end"));
        const limit = parseIntU(formData.get("limit"));
        const dry = String(formData.get("dry")) === "on";

        const itemsRaw = String(formData.get("items") ?? "").trim();
        const comboPackageId =
          String(formData.get("packageId") ?? "").trim() ||
          selectedPackageId ||
          "";
        const units = parseNumU(formData.get("units")) ?? 1;

        const payload: BulkPurchasePayload = {
          prefix,
          pad,
          start,
          end,
          dry,
          limit,
          items: itemsRaw ? parseItemsCsv(itemsRaw) : undefined,
          packageId: !itemsRaw ? comboPackageId || undefined : undefined,
          units: !itemsRaw ? units : undefined,
        };

        if (!payload.items && !payload.packageId) {
          throw new Error("패키지를 선택하거나 items CSV를 입력하세요.");
        }

        const r = await fetch("/api/admin/packages/user/bulk-purchase", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
          signal: ac.signal,
        });
        const body = parse(await r.text());
        if (!r.ok) throw new Error(`HTTP_${r.status}`);
        if (!isBulkPurchaseResult(body)) throw new Error("INVALID_RESPONSE");
        setResult(body);
        toast({
          title: "처리 완료",
          description: "대량 구매 작업이 완료되었습니다.",
        });
      } catch (e) {
        if (isAbortError(e)) {
          setError("NETWORK_TIMEOUT");
        } else {
          const msg = toMsg(e);
          setError(msg);
          toast({ title: "실패", description: msg, variant: "error" });
        }
      } finally {
        clearTimeout(to);
        setSubmitting(false);
      }
    },
    [selectedPackageId, toast]
  );

  return {
    // packages
    packages,
    pkLoading,
    pkError,
    pkSelectDisabled,
    selectedPackageId,
    setSelectedPackageId,

    // submit
    submitting,
    result,
    error,
    submit,
  };
}
