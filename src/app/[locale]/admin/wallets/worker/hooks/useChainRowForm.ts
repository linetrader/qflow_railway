// src/app/admin/wallets/worker/hooks/useChainRowForm.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isHttpUrl } from "../guards/isHttpUrl";
import type { ChainRow } from "@/types/admin/wallets/worker";

export function useChainRowForm(initial: ChainRow) {
  const [form, setForm] = useState<ChainRow>(initial);

  useEffect(() => setForm(initial), [initial]);

  const onChange = useCallback(
    <K extends keyof ChainRow>(k: K, v: ChainRow[K]) => {
      setForm((p) => (p[k] === v ? p : { ...p, [k]: v }));
    },
    []
  );

  const rpcUrlInvalid = useMemo(
    () => !form.rpcUrl || !isHttpUrl(String(form.rpcUrl)),
    [form.rpcUrl]
  );
  const confirmationsInvalid = useMemo(
    () =>
      !Number.isInteger(Number(form.confirmations)) ||
      Number(form.confirmations) < 0,
    [form.confirmations]
  );
  const scanBatchInvalid = useMemo(
    () =>
      !Number.isInteger(Number(form.scanBatch)) || Number(form.scanBatch) <= 0,
    [form.scanBatch]
  );
  const balanceConcInvalid = useMemo(
    () =>
      !Number.isInteger(Number(form.balanceConcurrency)) ||
      Number(form.balanceConcurrency) <= 0,
    [form.balanceConcurrency]
  );
  const logEveryNInvalid = useMemo(
    () =>
      !Number.isInteger(Number(form.balanceLogEveryN)) ||
      Number(form.balanceLogEveryN) <= 0,
    [form.balanceLogEveryN]
  );

  return {
    form,
    onChange,
    validity: {
      rpcUrlInvalid,
      confirmationsInvalid,
      scanBatchInvalid,
      balanceConcInvalid,
      logEveryNInvalid,
    },
  };
}
