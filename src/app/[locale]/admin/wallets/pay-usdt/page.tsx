// src/app/admin/wallets/pay-usdt/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import { isAbortError } from "../../lib/fetchWithRetry";
import { useToast } from "@/components/ui";

/** ---------- Types ---------- */
type ItemResult =
  | { username: string; status: "UPDATED"; amount: string }
  | { username: string; status: "DRY"; amount: string }
  | { username: string; status: "SKIPPED_RANGE" }
  | { username: string; status: "ERROR"; message: string };

type RespOk = {
  ok: true;
  summary: { targets: number; success: number; fail: number; dry: number };
  items: ItemResult[];
};
type RespErr = { ok: false; error: string };

/** ---------- Local view components (daisyUI) ---------- */
function AlertError(props: { message: string }) {
  return (
    <div role="alert" className="alert alert-error">
      <span className="font-medium">오류</span>
      <span className="truncate">{props.message}</span>
    </div>
  );
}
function AlertLoading(props: { text: string }) {
  return (
    <div role="status" className="alert">
      <span className="loading loading-spinner mr-2" />
      {props.text}
    </div>
  );
}
function StatCard(props: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-title">{props.label}</div>
      <div className="stat-value text-lg">{props.value}</div>
    </div>
  );
}
function SimpleTable(props: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead className="bg-base-200">
          <tr>
            {props.head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.length === 0 ? (
            <tr>
              <td
                colSpan={props.head.length}
                className="text-center text-base-content/60"
              >
                결과가 없습니다.
              </td>
            </tr>
          ) : (
            props.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={j === 2 ? "max-w-[28rem] truncate" : ""}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** ---------- Page ---------- */
export default function PayUsdtPage() {
  const { toast } = useToast();

  // 폼 상태
  const [amount, setAmount] = useState<string>("10000");
  const [prefix, setPrefix] = useState<string>("test");
  const [pad, setPad] = useState<number>(3);
  const [start, setStart] = useState<number | "">("");
  const [end, setEnd] = useState<number | "">("");
  const [dry, setDry] = useState<boolean>(false);

  // 요청 상태
  const [loading, setLoading] = useState<boolean>(false);
  const [resp, setResp] = useState<RespOk | RespErr | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 입력 검증
  const isValidDecimal = (s: string): boolean =>
    /^[0-9]+(\.[0-9]+)?$/.test(s.trim());
  const isRangeValid = useMemo(() => {
    if (start === "" && end === "") return true;
    if (typeof start !== "number" || typeof end !== "number") return false;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    if (start <= 0 || end <= 0) return false;
    return start <= end;
  }, [start, end]);

  const canSubmit = useMemo(() => {
    if (!amount.trim() || !isValidDecimal(amount)) return false;
    if (!prefix.trim()) return false;
    if (!Number.isFinite(pad) || pad < 0) return false;
    if (!isRangeValid) return false;
    return true;
  }, [amount, prefix, pad, isRangeValid]);

  // Abort + timeout
  const reqCtrlRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => reqCtrlRef.current?.abort();
  }, []);

  const run = useCallback(async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setResp(null);

    reqCtrlRef.current?.abort();
    const ac = new AbortController();
    reqCtrlRef.current = ac;
    const to = setTimeout(() => ac.abort(), 12_000);

    try {
      const body: Record<string, string | number | boolean> = {
        amount: amount.trim(),
        prefix: prefix.trim(),
        pad,
        dry,
      };
      if (start !== "") body.start = Number(start);
      if (end !== "") body.end = Number(end);

      const data = await fetchJson<RespOk | RespErr>(
        "/api/admin/test-users/pay-usdt",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
          signal: ac.signal,
        }
      );

      setResp(data);
      if (!("ok" in data) || data.ok !== true) {
        const msg = (data as RespErr).error ?? "REQUEST_FAILED";
        setError(msg);
        toast({ title: "요청 실패", description: msg, variant: "error" });
      } else {
        toast({
          title: "지급 완료",
          description: `성공 ${data.summary.success}, 실패 ${data.summary.fail}, DRY ${data.summary.dry}`,
        });
      }
    } catch (e: unknown) {
      if (isAbortError(e)) return;
      const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
      setError(msg);
      toast({ title: "네트워크 오류", description: msg, variant: "error" });
    } finally {
      clearTimeout(to);
      setLoading(false);
    }
  }, [amount, prefix, pad, start, end, dry, canSubmit, toast]);

  const ok = resp && "ok" in resp && resp.ok ? (resp as RespOk) : null;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (canSubmit) void run();
    else
      toast({
        title: "검증 오류",
        description: "입력값을 확인하세요.",
        variant: "error",
      });
  };

  return (
    <div className="space-y-6" data-theme="">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">테스트 계정 USDT 지급</h1>
        <Link href="/admin/wallets" className="btn btn-outline">
          지갑 목록으로
        </Link>
      </div>

      {/* 폼 카드 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* amount */}
            <label className="form-control">
              <span className="label-text">지급 금액 (USDT)</span>
              <input
                name="amount"
                className={`input input-bordered ${
                  amount && !isValidDecimal(amount) ? "input-error" : ""
                }`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="예: 10"
                required
              />
              {amount && !isValidDecimal(amount) ? (
                <span className="label-text-alt text-error">
                  숫자를 입력하세요
                </span>
              ) : null}
            </label>

            {/* prefix */}
            <label className="form-control">
              <span className="label-text">아이디 접두사 (prefix)</span>
              <input
                name="prefix"
                className={`input input-bordered ${
                  !prefix.trim() ? "input-error" : ""
                }`}
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="예: test"
                required
              />
              {!prefix.trim() ? (
                <span className="label-text-alt text-error">필수 입력</span>
              ) : null}
            </label>

            {/* pad */}
            <label className="form-control">
              <span className="label-text">숫자 zero pad</span>
              <input
                name="pad"
                type="number"
                className="input input-bordered"
                value={pad}
                onChange={(e) => setPad(Number(e.target.value))}
                min={0}
                required
              />
            </label>

            {/* start */}
            <label className="form-control">
              <span className="label-text">시작 번호 (선택)</span>
              <input
                name="start"
                type="number"
                className={`input input-bordered ${
                  start !== "" &&
                  (!Number.isFinite(Number(start)) || Number(start) <= 0)
                    ? "input-error"
                    : ""
                }`}
                value={start}
                onChange={(e) =>
                  setStart(e.target.value === "" ? "" : Number(e.target.value))
                }
                min={1}
                placeholder="예: 1"
              />
              {start !== "" &&
              (!Number.isFinite(Number(start)) || Number(start) <= 0) ? (
                <span className="label-text-alt text-error">1 이상의 숫자</span>
              ) : null}
            </label>

            {/* end */}
            <label className="form-control">
              <span className="label-text">끝 번호 (선택)</span>
              <input
                name="end"
                type="number"
                className={`input input-bordered ${
                  end !== "" &&
                  (!Number.isFinite(Number(end)) || Number(end) <= 0)
                    ? "input-error"
                    : ""
                }`}
                value={end}
                onChange={(e) =>
                  setEnd(e.target.value === "" ? "" : Number(e.target.value))
                }
                min={1}
                placeholder="예: 50"
              />
              {end !== "" &&
              (!Number.isFinite(Number(end)) || Number(end) <= 0) ? (
                <span className="label-text-alt text-error">1 이상의 숫자</span>
              ) : null}
            </label>

            {/* dry */}
            <label className="form-control">
              <span className="label-text">드라이런 (DB 쓰기 없음)</span>
              <input
                name="dry"
                type="checkbox"
                className="toggle"
                checked={dry}
                onChange={(e) => setDry(e.target.checked)}
              />
            </label>

            {/* actions */}
            <div className="col-span-full flex gap-2">
              <button
                type="submit"
                className={`btn btn-primary ${loading ? "loading" : ""}`}
                disabled={!canSubmit || loading}
              >
                테스트 테더 넣기
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setAmount("10000");
                  setPrefix("test");
                  setPad(3);
                  setStart("");
                  setEnd("");
                  setDry(false);
                  setResp(null);
                  setError(null);
                  toast({
                    title: "초기화",
                    description: "기본값으로 되돌렸습니다.",
                  });
                }}
              >
                초기값으로
              </button>
            </div>
          </form>

          {/* 상태 표시 */}
          {!loading && error ? (
            <div className="mt-3">
              <AlertError message={error} />
            </div>
          ) : null}
          {loading ? (
            <div className="mt-3">
              <AlertLoading text="실행 중…" />
            </div>
          ) : null}
        </div>
      </div>

      {/* 응답 표시 */}
      {resp && "ok" in resp && !resp.ok ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body text-sm text-error">오류: {resp.error}</div>
        </div>
      ) : null}

      {ok ? (
        <div className="space-y-3">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="stats shadow">
                <StatCard label="대상 수" value={ok.summary.targets} />
                <StatCard label="성공" value={ok.summary.success} />
                <StatCard label="DRY" value={ok.summary.dry} />
                <StatCard label="실패" value={ok.summary.fail} />
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title">결과 목록</h3>
              <SimpleTable
                head={["username", "status", "amount / message"]}
                rows={ok.items.map((it) => [
                  it.username,
                  it.status,
                  "amount" in it
                    ? it.amount
                    : "message" in it
                    ? it.message
                    : "-",
                ])}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
