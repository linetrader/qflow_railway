// src/app/admin/users/bulk-signup/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import { isAbortError } from "../../lib/fetchWithRetry";
import { useToast } from "@/components/ui";

type ItemCreated = {
  n: number;
  username: string;
  status: "CREATED";
  id: string;
  referrer: string;
};
type ItemSkipped = { n: number; username: string; status: "SKIPPED_EXISTS" };
type ItemDry = { n: number; username: string; status: "DRY"; referrer: string };
type ItemError = {
  n: number;
  username: string;
  status: "ERROR";
  message: string;
};

export type ItemResult = ItemCreated | ItemSkipped | ItemDry | ItemError;

export type RespOk = {
  ok: true;
  summary: {
    requested: number;
    created: number;
    skipped: number;
    dry: number;
    errors: number;
    lastParent: string;
    mode: "range" | "count" | "attachByLevel";
    parentsUsed?: number;
  };
  items: ItemResult[];
};
export type RespErr = { ok: false; error: string };

import { HeaderView } from "./view/HeaderView";
import { ErrorAlert } from "./view/ErrorAlert";
import { LoadingBar } from "./view/LoadingBar";
import { SettingsForm } from "./view/SettingsForm";
import { SummaryView } from "./view/SummaryView";
import { ResultsTable } from "./view/ResultsTable";

export default function BulkSignupPage() {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState("test");
  const [pad, setPad] = useState(3);
  const [root, setRoot] = useState("admin");
  const [password, setPassword] = useState("Test1234!");
  const [country, setCountry] = useState("");
  const [dry, setDry] = useState(false);
  const [bcryptCost, setBcryptCost] = useState(12);
  const [delayMs, setDelayMs] = useState(50);

  const [parentLevel, setParentLevel] = useState(0);
  const [attachPerParent, setAttachPerParent] = useState(0);
  const [parentFilterPrefix, setParentFilterPrefix] = useState("");
  const [parentLimit, setParentLimit] = useState(200);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<RespOk | RespErr | null>(null);

  const acRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const isAttachMode = parentLevel > 0 && attachPerParent > 0;
  const isCountMode = !isAttachMode && start === 0 && end === 0;

  const validationError = useMemo(() => {
    if (bcryptCost < 4 || bcryptCost > 15)
      return "bcryptCost는 4~15 사이여야 합니다.";
    if (pad < 0) return "pad는 0 이상이어야 합니다.";
    if (isAttachMode && parentLimit < 1)
      return "parentLimit은 1 이상이어야 합니다.";
    if (isCountMode && count < 1) return "count는 1 이상이어야 합니다.";
    if (
      !isAttachMode &&
      !isCountMode &&
      (start < 0 || end < 0 || end < start)
    ) {
      return "범위 모드에서는 start/end를 올바르게 지정하세요.";
    }
    return undefined;
  }, [
    bcryptCost,
    pad,
    isAttachMode,
    parentLimit,
    isCountMode,
    count,
    start,
    end,
  ]);

  async function run() {
    setError(null);
    setResp(null);

    if (validationError) {
      setError(validationError);
      toast({
        title: "유효성 오류",
        description: validationError,
        variant: "error",
      });
      return;
    }

    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    const to = setTimeout(() => ac.abort(), 45_000);

    try {
      setSubmitting(true);

      const payload: {
        start: number;
        end: number;
        prefix: string;
        pad: number;
        root: string;
        password: string;
        country?: string;
        dry: boolean;
        bcryptCost: number;
        delayMs: number;
        parentLevel?: number;
        attachPerParent?: number;
        parentFilterPrefix?: string;
        parentLimit?: number;
        count?: number;
      } = {
        start,
        end,
        prefix,
        pad,
        root,
        password,
        country: country.trim() || undefined,
        dry,
        bcryptCost,
        delayMs,
      };

      if (isAttachMode) {
        payload.parentLevel = parentLevel;
        payload.attachPerParent = attachPerParent;
        payload.parentFilterPrefix = parentFilterPrefix.trim() || undefined;
        payload.parentLimit = parentLimit;
      } else if (isCountMode) {
        payload.count = count;
      }

      const data = await fetchJson<RespOk | RespErr>(
        "/api/admin/test-users/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
          signal: ac.signal,
        }
      );

      setResp(data);
      toast({ title: "완료", description: "대량 생성 요청이 처리되었습니다." });
    } catch (e) {
      if (isAbortError(e)) return;
      const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
      setError(msg);
      toast({ title: "요청 실패", description: msg, variant: "error" });
    } finally {
      clearTimeout(to);
      setSubmitting(false);
    }
  }

  const ok = resp && resp.ok ? (resp as RespOk) : null;
  const err = resp && !resp.ok ? (resp as RespErr) : null;

  return (
    <div className="space-y-6" data-theme="">
      <div className="flex items-center justify-between">
        <HeaderView
          title="대량 테스트 계정 생성"
          subtitle="범위/수량/특정 레벨 부모 모드 지원"
        />
        <Link href="/admin/users" className="btn btn-outline">
          유저 목록으로
        </Link>
      </div>

      {submitting && <LoadingBar text="실행 중…" />}
      {error && <ErrorAlert message={error} />}

      <SettingsForm
        start={start}
        end={end}
        count={count}
        prefix={prefix}
        pad={pad}
        root={root}
        password={password}
        country={country}
        dry={dry}
        bcryptCost={bcryptCost}
        delayMs={delayMs}
        parentLevel={parentLevel}
        attachPerParent={attachPerParent}
        parentFilterPrefix={parentFilterPrefix}
        parentLimit={parentLimit}
        onStart={setStart}
        onEnd={setEnd}
        onCount={setCount}
        onPrefix={setPrefix}
        onPad={setPad}
        onRoot={setRoot}
        onPassword={setPassword}
        onCountry={setCountry}
        onDry={setDry}
        onBcryptCost={setBcryptCost}
        onDelayMs={setDelayMs}
        onParentLevel={setParentLevel}
        onAttachPerParent={setAttachPerParent}
        onParentFilterPrefix={setParentFilterPrefix}
        onParentLimit={setParentLimit}
        submitting={submitting}
        onSubmit={run}
        validationError={validationError}
      />

      {err && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title">서버 오류</h3>
            <p className="text-sm text-error">{err.error}</p>
          </div>
        </div>
      )}

      {ok && (
        <>
          <SummaryView summary={ok.summary} />
          <ResultsTable items={ok.items} />
        </>
      )}
    </div>
  );
}
