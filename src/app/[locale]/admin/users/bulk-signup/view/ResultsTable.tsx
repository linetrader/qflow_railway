// src/app/admin/users/bulk-signup/view/ResultsTable.tsx
"use client";

import type { ItemResult } from "../page";

function extraText(it: ItemResult): string {
  switch (it.status) {
    case "DRY":
      return it.referrer;
    case "CREATED":
      return it.id;
    case "ERROR":
      return it.message;
    case "SKIPPED_EXISTS":
      return "-";
    default: {
      return "-";
    }
  }
}

export function ResultsTable(props: { items: ItemResult[] }) {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h3 className="card-title">결과 목록</h3>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead className="sticky top-0 bg-base-200">
              <tr>
                <th>n</th>
                <th>username</th>
                <th>status</th>
                <th>ref/id/msg</th>
              </tr>
            </thead>
            <tbody>
              {props.items.map((it) => (
                <tr key={`${it.username}:${it.n}`}>
                  <td>{it.n}</td>
                  <td>{it.username}</td>
                  <td>{it.status}</td>
                  <td className="max-w-[24rem] truncate">{extraText(it)}</td>
                </tr>
              ))}
              {props.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-base-content/60">
                    결과가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
