// src/app/admin/wallets/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import { isAbortError } from "../../lib/fetchWithRetry";
import { useToast } from "@/components/ui";

/** ---------- Types ---------- */
type TxLite = { id: string; createdAt: string };

type Wallet = {
  id: string;
  depositAddress: string | null;
  withdrawAddress: string | null;
  balanceUSDT: string;
  balanceQAI: string;
  balanceDFT: string;
  depositKeyAlg: string | null;
  depositKeyVersion: number | null;
  createdAt: string;
  updatedAt: string;
};

type WalletDetail = {
  id: string;
  username: string;
  email: string;
  name: string;
  level: number;
  countryCode: string | null;
  createdAt: string;
  wallet: Wallet | null;
  _count: { walletTxs: number };
  walletTxs: TxLite[];
};

type ApiOk = { item: WalletDetail };

/** ---------- Helpers ---------- */
async function fetchWithRetry<T>(
  url: string,
  init: RequestInit,
  attempts = 3,
  externalSignal?: AbortSignal
): Promise<T> {
  let lastErr: unknown = null;

  for (let i = 0; i < attempts; i++) {
    const ac = new AbortController();

    let offExternalAbort: (() => void) | undefined;
    if (externalSignal) {
      const onAbort = () => ac.abort();
      externalSignal.addEventListener("abort", onAbort, { once: true });
      offExternalAbort = () =>
        externalSignal.removeEventListener("abort", onAbort);
    }
    const timeout = setTimeout(() => ac.abort(), 15_000);

    try {
      const json = await fetchJson<T>(url, { ...init, signal: ac.signal });
      clearTimeout(timeout);
      offExternalAbort?.();
      return json;
    } catch (e: unknown) {
      clearTimeout(timeout);
      offExternalAbort?.();
      lastErr = e;

      const msg = e instanceof Error ? e.message : "";
      const is504 = /HTTP_504|UPSTREAM_TIMEOUT/.test(msg);

      if ((isAbortError(e) || is504) && i < attempts - 1) {
        const backoffMs =
          300 * Math.pow(2, i) + Math.floor(Math.random() * 200);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("UNKNOWN_ERROR");
}

/** ---------- Page ---------- */
export default function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<WalletDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const apiUrl = useMemo(() => (id ? `/api/admin/wallets/${id}` : ""), [id]);

  useEffect(() => {
    if (!apiUrl) {
      setLoading(false);
      setError("NOT_FOUND");
      return;
    }

    const outerCtrl = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const json = await fetchWithRetry<ApiOk>(
          apiUrl,
          { cache: "no-store" },
          3,
          outerCtrl.signal
        );
        setData(json.item);
      } catch (e: unknown) {
        setData(null);
        const msg = isAbortError(e)
          ? "NETWORK_TIMEOUT"
          : e instanceof Error
          ? e.message
          : "UNKNOWN_ERROR";
        setError(msg);
        toast({ title: "로드 실패", description: msg, variant: "error" });
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      outerCtrl.abort();
    };
  }, [apiUrl, toast]);

  const onRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 300);
  };

  return (
    <div className="space-y-4" data-theme="">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">지갑 상세</h1>
          {data ? (
            <p className="text-sm text-base-content/60">
              {data.username} ({data.email})
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link href="/admin/wallets" className="btn btn-outline">
            목록으로
          </Link>
          <button
            type="button"
            className={`btn btn-ghost ${refreshing ? "loading" : ""}`}
            onClick={onRefresh}
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 로딩/오류 표시 */}
      {loading && (
        <div role="status" className="alert">
          <span className="loading loading-spinner mr-2" />
          불러오는 중…
        </div>
      )}
      {error && (
        <div role="alert" className="alert alert-error">
          <span className="font-medium">오류</span>
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* 본문 */}
      {data && (
        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">기본 정보</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow
                  label="아이디"
                  value={data.username}
                  valueClass="font-medium"
                />
                <InfoRow label="이름" value={data.name} />
                <InfoRow label="이메일" value={data.email} />
                <InfoRow label="레벨" value={String(data.level)} />
                <InfoRow label="국가" value={data.countryCode ?? "-"} />
                <InfoRow
                  label="가입일"
                  value={new Date(data.createdAt).toLocaleString()}
                />
                <InfoRow
                  label="지갑 TX 수"
                  value={data._count.walletTxs.toLocaleString()}
                />
              </div>
            </div>
          </div>

          {/* 지갑 정보 */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">지갑 정보</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow
                  label="입금 주소"
                  value={data.wallet?.depositAddress ?? "-"}
                  mono
                />
                <InfoRow
                  label="출금 주소"
                  value={data.wallet?.withdrawAddress ?? "-"}
                  mono
                />
                <InfoRow
                  label="USDT 잔고"
                  value={data.wallet?.balanceUSDT ?? "-"}
                />
                <InfoRow
                  label="QAI 잔고"
                  value={data.wallet?.balanceQAI ?? "-"}
                />
                <InfoRow
                  label="DFT 잔고"
                  value={data.wallet?.balanceDFT ?? "-"}
                />
                <InfoRow
                  label="지갑 생성일"
                  value={
                    data.wallet
                      ? new Date(data.wallet.createdAt).toLocaleString()
                      : "-"
                  }
                />
                <InfoRow
                  label="지갑 수정일"
                  value={
                    data.wallet
                      ? new Date(data.wallet.updatedAt).toLocaleString()
                      : "-"
                  }
                />
                <InfoRow
                  label="키 알고리즘"
                  value={data.wallet?.depositKeyAlg ?? "-"}
                />
                <InfoRow
                  label="키 버전"
                  value={
                    data.wallet?.depositKeyVersion != null
                      ? String(data.wallet.depositKeyVersion)
                      : "-"
                  }
                />
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  className={`btn btn-outline ${refreshing ? "loading" : ""}`}
                  onClick={onRefresh}
                  disabled={refreshing}
                >
                  새로고침
                </button>
              </div>
            </div>
          </div>

          {/* 최근 트랜잭션 */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">최근 트랜잭션 (최대 10건)</h2>
              {data.walletTxs.length === 0 ? (
                <div className="text-sm text-base-content/60">내역 없음</div>
              ) : (
                <ul className="space-y-2">
                  {data.walletTxs.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span className="font-mono text-xs break-all">
                        {t.id}
                      </span>
                      <span className="text-sm">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** daisyUI용 정보 행 */
function InfoRow(props: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}) {
  const cls = [
    "px-3 py-2 rounded-lg border bg-base-100 flex flex-col gap-1",
  ].join(" ");
  const valCls = [
    props.mono ? "font-mono break-all" : "",
    props.valueClass ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <div className="text-xs text-base-content/60">{props.label}</div>
      <div className={valCls}>{props.value}</div>
    </div>
  );
}
