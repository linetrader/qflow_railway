"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { safeParse, toMsg } from "@/app/[locale]/admin/lib/json";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import { isAbortError } from "@/app/[locale]/admin/packages/guards/net";
import { isCreateResp } from "@/app/[locale]/admin/packages/guards/packages";

const DEC_RE = /^[0-9]+(\.[0-9]+)?$/;

export function usePackageCreate() {
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [dailyDftAmount, setDailyDftAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(
    () => () => {
      acRef.current?.abort();
      acRef.current = null;
    },
    []
  );

  const isValid =
    name.trim().length > 0 &&
    DEC_RE.test(price.trim()) &&
    DEC_RE.test(dailyDftAmount.trim());

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!isValid) {
      const msg = "입력값을 확인하세요.";
      setError(msg);
      toast({ title: "검증 실패", description: msg, variant: "error" });
      return;
    }
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    const timeout = setTimeout(() => ac.abort(), 12_000);

    try {
      setSubmitting(true);
      const r = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name: name.trim(),
          price: price.trim(),
          dailyDftAmount: dailyDftAmount.trim(),
        }),
        signal: ac.signal,
      });
      const body = safeParse(await r.text());
      if (!r.ok || !isCreateResp(body))
        throw new Error(r.ok ? "INVALID_RESPONSE" : `HTTP_${r.status}`);
      router.replace(`/admin/packages/${body.item.id}`);
      router.refresh();
      toast({ title: "등록 완료", description: body.item.name });
    } catch (e) {
      if (isAbortError(e)) {
        setError("NETWORK_TIMEOUT");
      } else {
        const msg = toMsg(e);
        setError(msg);
        toast({ title: "등록 실패", description: msg, variant: "error" });
      }
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  }, [name, price, dailyDftAmount, isValid, router, toast]);

  return {
    DEC_RE,
    state: { name, price, dailyDftAmount, submitting, error, isValid },
    setName,
    setPrice,
    setDailyDftAmount,
    onSubmit,
  };
}
