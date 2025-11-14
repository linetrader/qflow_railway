// src/app/admin/wallets/admin-wallet/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import { fetchWithRetry, isAbortError } from "../../lib/fetchWithRetry";
import { useToast } from "@/components/ui";

/** ---------- Types ---------- */
type Bal = {
  address: string | null;
  decimals: number;
  raw: string;
  formatted: string;
};
type Resp = {
  ok: boolean;
  chain: { id: string; rpcUrl: string };
  address: string;
  assets: { BNB: Bal; USDT: Bal; DFT: Bal | null };
  message?: string;
};

type Asset = "BNB" | "USDT" | "DFT";
function isAsset(v: string): v is Asset {
  return v === "BNB" || v === "USDT" || v === "DFT";
}

/** ---------- Utils ---------- */
function amountFromBal(
  bal: { raw: string; decimals: number } | null | undefined
): number | null {
  if (!bal) return null;
  const rawNum = Number(bal.raw);
  if (!Number.isFinite(rawNum)) return null;
  return rawNum / Math.pow(10, bal.decimals);
}

/** ---------- Local view components (daisyUI) ---------- */
function AssetStatCard(props: {
  code: string;
  name: string;
  amount: number | null;
  tokenAddress?: string | null;
}) {
  const { code, name, amount, tokenAddress } = props;
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="text-sm text-base-content/60">{code}</div>
          <div className="badge badge-outline">{name}</div>
        </div>
        <div className="text-2xl font-bold mt-1">
          {amount != null
            ? amount.toLocaleString(undefined, { maximumFractionDigits: 6 })
            : "-"}
        </div>
        {tokenAddress ? (
          <div className="mt-2 text-xs text-base-content/60">
            token: <span className="font-mono break-all">{tokenAddress}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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

/** ---------- Page ---------- */
export default function AdminWalletPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // 전송 폼
  const [to, setTo] = useState("");
  const [asset, setAsset] = useState<Asset>("BNB");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);

  const { toast } = useToast();

  const dftEnabled = !!data?.assets.DFT;

  // DFT 선택 방어
  useEffect(() => {
    if (!dftEnabled && asset === "DFT") setAsset("BNB");
  }, [dftEnabled, asset]);

  // ----- 조회(재시도 적용) -----
  const fetchBalances = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const json = await fetchWithRetry<Resp>(
        "/api/admin/wallets/admin-wallet",
        { cache: "no-store" },
        3,
        15_000
      );
      if (json.ok) {
        setData(json);
      } else {
        setLoadErr(json.message ?? "조회 실패");
        toast({
          title: "조회 실패",
          description: json.message ?? "조회 실패",
          variant: "error",
        });
      }
    } catch (e: unknown) {
      const msg = isAbortError(e)
        ? "NETWORK_TIMEOUT"
        : e instanceof Error
        ? e.message
        : "UNKNOWN_ERROR";
      setLoadErr(msg);
      toast({
        title: "네트워크 오류",
        description: msg,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchBalances();
  }, [fetchBalances]);

  // ----- 전송 검증 -----
  const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(to.trim());
  const isValidAmt = useMemo(() => {
    if (!amount.trim()) return false;
    const n = Number(amount);
    return Number.isFinite(n) && n > 0;
  }, [amount]);

  const canSend = useMemo(() => {
    if (!data) return false;
    if (asset === "DFT" && !dftEnabled) return false;
    if (!isValidAddr || !isValidAmt) return false;
    return true;
  }, [data, asset, dftEnabled, isValidAddr, isValidAmt]);

  // ----- 전송(POST는 재시도 X) -----
  const onSend = async () => {
    if (!canSend) return;
    setSendErr(null);
    setSending(true);
    try {
      const res = await fetchJson<{
        ok: boolean;
        txHash?: string;
        message?: string;
        code?: string;
      }>("/api/admin/wallets/admin-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), asset, amount: amount.trim() }),
      });

      if (!res.ok) {
        const msg = res.message ?? res.code ?? "전송 실패";
        setSendErr(msg);
        toast({ title: "전송 실패", description: msg, variant: "error" });
        return;
      }
      toast({
        title: "전송 성공",
        description: res.txHash ? `TxHash: ${res.txHash}` : "TxHash: -",
      });
      setAmount("");
      setTo("");
      await fetchBalances();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
      setSendErr(msg);
      toast({ title: "전송 실패", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    void onSend();
  };

  return (
    <div className="space-y-6" data-theme="">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">어드민 지갑 (BNB 체인)</h1>
          {data ? (
            <p className="text-sm text-base-content/60">
              체인{" "}
              <code className="rounded bg-base-200 px-1 py-0.5">
                {data.chain.id}
              </code>
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link href="/admin/wallets" className="btn btn-outline">
            지갑 목록
          </Link>
        </div>
      </div>

      {/* 잔고 섹션 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm">
              주소:{" "}
              <span className="font-mono select-all">
                {data?.address ?? "-"}
              </span>
            </div>
            <button
              type="button"
              className={`btn btn-ghost ${loading ? "loading" : ""}`}
              onClick={fetchBalances}
              disabled={loading}
            >
              잔고 새로고침
            </button>
          </div>

          {loading && <AlertLoading text="불러오는 중…" />}
          {loadErr && <AlertError message={loadErr} />}

          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <AssetStatCard
              code="BNB"
              name="BNB"
              amount={amountFromBal(data?.assets.BNB)}
              tokenAddress={data?.assets.BNB.address ?? null}
            />
            <AssetStatCard
              code="USDT"
              name="USDT"
              amount={amountFromBal(data?.assets.USDT)}
              tokenAddress={data?.assets.USDT.address ?? null}
            />
            <AssetStatCard
              code="DFT"
              name="DFT"
              amount={amountFromBal(data?.assets.DFT ?? null)}
              tokenAddress={
                (data?.assets.DFT?.address as string | null) ?? null
              }
            />
          </div>
        </div>
      </div>

      {/* 전송 섹션 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="mb-3 text-lg font-semibold">전송</h2>

          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4">
            {/* 자산 */}
            <label className="form-control">
              <span className="label-text">자산</span>
              <select
                name="asset"
                className="select select-bordered"
                value={asset}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isAsset(v)) {
                    setAsset(!dftEnabled && v === "DFT" ? "BNB" : v);
                  }
                }}
              >
                <option value="BNB">BNB</option>
                <option value="USDT">USDT</option>
                {dftEnabled ? <option value="DFT">DFT</option> : null}
              </select>
            </label>

            {/* 수신자 주소 */}
            <label className="form-control">
              <span className="label-text">수신자 주소(0x…)</span>
              <input
                name="to"
                type="text"
                className={`input input-bordered ${
                  to && !isValidAddr ? "input-error" : ""
                }`}
                placeholder="0x0000…"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                autoComplete="off"
              />
              {to && !isValidAddr ? (
                <span className="label-text-alt text-error">
                  올바른 EVM 주소를 입력하세요.
                </span>
              ) : null}
            </label>

            {/* 금액 */}
            <label className="form-control">
              <span className="label-text">금액</span>
              <input
                name="amount"
                type="text"
                className={`input input-bordered ${
                  amount && !isValidAmt ? "input-error" : ""
                }`}
                placeholder="예) 1.25"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
              />
              {amount && !isValidAmt ? (
                <span className="label-text-alt text-error">
                  0보다 큰 숫자를 입력하세요.
                </span>
              ) : null}
            </label>

            {/* 액션 */}
            <div className="flex items-end">
              <button
                type="submit"
                className={`btn btn-primary ${sending ? "loading" : ""}`}
                disabled={!canSend || sending}
              >
                전송
              </button>
            </div>
          </form>

          {sendErr ? (
            <div className="mt-3">
              <AlertError message={sendErr} />
            </div>
          ) : null}

          {!dftEnabled && (
            <p className="mt-3 text-xs text-base-content/60">
              DFT 토큰 주소가 아직 설정되지 않아 전송을 비활성화했습니다. 주소가
              공개되면 자동으로 활성화됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
