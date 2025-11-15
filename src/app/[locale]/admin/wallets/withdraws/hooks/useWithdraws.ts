// src/app/[locale]/admin/wallets/withdraws/hooks/useWithdraws.ts
// 출금 승인/취소 어드민 화면에서 사용하는 상태/비즈니스 로직 훅

"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminWithdrawRow,
  AdminWithdrawAction,
  AdminWithdrawActionResult,
  UseAdminWithdrawsReturn,
} from "../types";
import {
  parseWithdrawActionResponse,
  parseWithdrawListResponse,
} from "../gaurd/withdraws";

// 초기 rows 값을 반환하는 헬퍼 (타입 안전성을 위해 함수로 분리)
function getInitialRows(): AdminWithdrawRow[] {
  return [];
}

// 출금 승인/취소 어드민 훅
// - 출금 요청 목록 로딩
// - 승인/취소 액션 호출
// - 로딩/에러 상태 관리
export function useAdminWithdraws(): UseAdminWithdrawsReturn {
  // PENDING 출금 요청 리스트
  const [rows, setRows] = useState<AdminWithdrawRow[]>(getInitialRows);
  // API 호출 로딩 상태
  const [loading, setLoading] = useState<boolean>(false);
  // 에러 메시지 (없으면 null)
  const [error, setError] = useState<string | null>(null);

  // 출금 목록을 서버에서 가져오는 함수
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/wallets/withdraws", {
        method: "GET",
        cache: "no-store", // 항상 최신 목록을 가져오기 위해 캐시 사용 안 함
      });

      const json = (await res.json()) as unknown;
      const parsed = parseWithdrawListResponse(json);

      // 서버 응답에서 ok=false 이면 에러로 처리
      if (!parsed.ok) {
        setError(parsed.message);
        setRows([]);
        return;
      }

      // 정상 응답 시 rows 업데이트
      setRows(parsed.data);
    } catch (e) {
      // 네트워크 예외 등 처리
      setError((e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 첫 마운트 시 자동으로 목록 한 번 불러오기
  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // 바깥에서 호출 가능한 새로고침 함수
  const refresh = useCallback(() => {
    void fetchList();
  }, [fetchList]);

  // 단일 출금 요청에 대한 승인/취소 처리
  const handleAction = useCallback(
    async (
      id: string,
      action: AdminWithdrawAction
    ): Promise<AdminWithdrawActionResult> => {
      try {
        const res = await fetch("/api/admin/wallets/withdraws", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // id + action("approve" | "reject") 전달
          body: JSON.stringify({ id, action }),
        });

        const json = (await res.json()) as unknown;
        const parsed = parseWithdrawActionResponse(json);

        // 서버에서 ok=false 반환 시
        if (!parsed.ok) {
          return {
            ok: false,
            message: parsed.message,
          };
        }

        // 성공 시 목록에서 해당 행 제거 (approve/reject 공통)
        if (action === "reject") {
          setRows((prev) => prev.filter((row) => row.id !== id));
        } else {
          setRows((prev) => prev.filter((row) => row.id !== id));
        }

        return {
          ok: true,
          message:
            action === "reject"
              ? "출금 요청이 취소되었습니다."
              : "출금이 승인되었습니다.",
          txHash: parsed.txHash, // 승인인 경우 체인 트랜잭션 해시 포함 가능
        };
      } catch (e) {
        // 네트워크/예외 발생 시 에러 메시지만 리턴
        return {
          ok: false,
          message: (e as Error).message,
        };
      }
    },
    []
  );

  // 훅 외부에 노출되는 값/함수들
  return {
    loading,
    error,
    rows,
    refresh,
    handleAction,
  };
}
