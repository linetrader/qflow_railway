// src/app/admin/packages/user/bulk-purchase/view/BulkPurchaseResultView.tsx
"use client";

import type {
  BulkPurchaseResult,
  BulkPurchaseRun,
} from "@/types/admin/packages/user/packages-bulk";
import { isBulkPurchaseDry } from "../guards/packages-bulk";

export default function BulkPurchaseResultView(props: {
  result: BulkPurchaseResult;
}) {
  const { result } = props;

  // 1) Dry 모드 분기 (타입 내로잉)
  if (isBulkPurchaseDry(result)) {
    return (
      <div className="card p-3 space-y-2">
        <div>대상 수: {result.count}</div>
        <div className="max-h-64 overflow-auto rounded bg-base-200 p-2">
          <ul className="list-disc pl-5 text-sm">
            {result.targets.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // 2) 실행 결과 분기 (구체 타입으로 고정)
  const run: BulkPurchaseRun = result;

  return (
    <div className="card p-3 space-y-2">
      <div className="text-sm opacity-70">
        총 {run.total}명 / 성공 {run.success} / 실패 {run.fail}
      </div>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Username</th>
              <th>Result</th>
              <th>Total (USDT)</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {run.items.map((r: BulkPurchaseRun["items"][number]) => (
              <tr key={r.username}>
                <td>{r.username}</td>
                <td>{r.ok ? "OK" : "FAIL"}</td>
                <td>{r.totalUSD ?? "-"}</td>
                <td>{r.message ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
