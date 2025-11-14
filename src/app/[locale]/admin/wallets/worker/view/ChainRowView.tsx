// src/app/admin/wallets/worker/view/ChainRowView.tsx
"use client";

import { useCallback } from "react";
import { useChainRowForm } from "../hooks/useChainRowForm";
import { useToast } from "@/components/ui";
import type { ChainRow } from "@/types/admin/wallets/worker";

type Props = {
  row: ChainRow;
  saving: boolean;
  onSave: (r: ChainRow) => Promise<void> | void;
};

export default function ChainRowView({ row, saving, onSave }: Props) {
  const { form, onChange, validity } = useChainRowForm(row);
  const { toast } = useToast();

  const canSave =
    !saving &&
    !validity.rpcUrlInvalid &&
    !validity.confirmationsInvalid &&
    !validity.scanBatchInvalid &&
    !validity.balanceConcInvalid &&
    !validity.logEveryNInvalid;

  const handleSave = useCallback(async () => {
    if (!canSave) {
      toast({
        title: "저장 불가",
        description: "입력값을 확인하세요.",
        variant: "error",
      });
      return;
    }
    await onSave(form);
    toast({
      title: "저장됨",
      description: `${form.id} 설정이 저장되었습니다.`,
    });
  }, [canSave, form, onSave, toast]);

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">{form.id}</div>
          <div className="flex items-center gap-3">
            <label className="label cursor-pointer">
              <span className="label-text mr-2">활성</span>
              <input
                type="checkbox"
                className="toggle"
                checked={!!form.isEnabled}
                onChange={(e) => onChange("isEnabled", e.target.checked)}
              />
            </label>

            <button
              className={`btn btn-sm ${
                canSave ? "btn-primary" : "btn-disabled"
              }`}
              onClick={handleSave}
              disabled={!canSave || saving}
              aria-disabled={!canSave}
              aria-busy={saving}
            >
              {saving ? "저장중…" : "저장"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {/* RPC URL */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">RPC URL</span>
            </div>
            <input
              name="rpcUrl"
              className={`input input-bordered w-full ${
                validity.rpcUrlInvalid ? "input-error" : ""
              }`}
              placeholder="https://…"
              value={String(form.rpcUrl ?? "")}
              onChange={(e) => onChange("rpcUrl", e.target.value)}
            />
            {validity.rpcUrlInvalid && (
              <div className="label">
                <span className="label-text-alt text-error">
                  http(s) URL 형식이어야 합니다.
                </span>
              </div>
            )}
          </label>

          {/* Confirmations */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Confirmations</span>
            </div>
            <input
              name="confirmations"
              type="number"
              min={0}
              step={1}
              className={`input input-bordered w-full ${
                validity.confirmationsInvalid ? "input-error" : ""
              }`}
              value={Number(form.confirmations ?? 0)}
              onChange={(e) =>
                onChange("confirmations", Number(e.target.value))
              }
            />
            {validity.confirmationsInvalid && (
              <div className="label">
                <span className="label-text-alt text-error">0 이상의 정수</span>
              </div>
            )}
          </label>

          {/* USDT */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">USDT 컨트랙트</span>
            </div>
            <input
              name="usdtAddress"
              className="input input-bordered w-full"
              placeholder="0x… (선택)"
              value={String(form.usdtAddress ?? "")}
              onChange={(e) => onChange("usdtAddress", e.target.value)}
            />
          </label>

          {/* DFT */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">DFT 컨트랙트</span>
            </div>
            <input
              name="dftAddress"
              className="input input-bordered w-full"
              placeholder="0x..."
              value={String(form.dftAddress ?? "")}
              onChange={(e) => onChange("dftAddress", e.target.value)}
            />
          </label>

          {/* Scan Batch */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Scan Batch</span>
            </div>
            <input
              name="scanBatch"
              type="number"
              min={1}
              step={1}
              className={`input input-bordered w-full ${
                validity.scanBatchInvalid ? "input-error" : ""
              }`}
              value={Number(form.scanBatch ?? 1)}
              onChange={(e) => onChange("scanBatch", Number(e.target.value))}
            />
            {validity.scanBatchInvalid && (
              <div className="label">
                <span className="label-text-alt text-error">1 이상의 정수</span>
              </div>
            )}
          </label>

          {/* BNB Min */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">BNB 최소 잔액(Sweep)</span>
            </div>
            <input
              name="bnbMinForSweep"
              inputMode="decimal"
              className="input input-bordered w-full"
              placeholder="0.001"
              value={String(form.bnbMinForSweep ?? "")}
              onChange={(e) => onChange("bnbMinForSweep", e.target.value)}
            />
          </label>

          {/* Balance Concurrency */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Balance Concurrency</span>
            </div>
            <input
              name="balanceConcurrency"
              type="number"
              min={1}
              step={1}
              className={`input input-bordered w-full ${
                validity.balanceConcInvalid ? "input-error" : ""
              }`}
              value={Number(form.balanceConcurrency ?? 1)}
              onChange={(e) =>
                onChange("balanceConcurrency", Number(e.target.value))
              }
            />
            {validity.balanceConcInvalid && (
              <div className="label">
                <span className="label-text-alt text-error">1 이상의 정수</span>
              </div>
            )}
          </label>

          {/* Balance Log Every N */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Balance Log Every N</span>
            </div>
            <input
              name="balanceLogEveryN"
              type="number"
              min={1}
              step={1}
              className={`input input-bordered w-full ${
                validity.logEveryNInvalid ? "input-error" : ""
              }`}
              value={Number(form.balanceLogEveryN ?? 1)}
              onChange={(e) =>
                onChange("balanceLogEveryN", Number(e.target.value))
              }
            />
            {validity.logEveryNInvalid && (
              <div className="label">
                <span className="label-text-alt text-error">1 이상의 정수</span>
              </div>
            )}
          </label>

          {/* Sweep if USDT > 0 */}
          <label className="label cursor-pointer">
            <span className="label-text mr-2">USDT 잔고 &gt; 0이면 스윕</span>
            <input
              type="checkbox"
              className="toggle"
              checked={!!form.sweepIfUsdtGtZero}
              onChange={(e) => onChange("sweepIfUsdtGtZero", e.target.checked)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
