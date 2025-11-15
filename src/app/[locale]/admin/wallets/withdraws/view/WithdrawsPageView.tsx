// src/app/[locale]/admin/wallets/withdraws/view/WithdrawsPageView.tsx
// 출금 승인/취소 어드민 화면의 실제 UI 렌더링 컴포넌트 (daisyUI 기반)

"use client";

import { useState } from "react";
import { useAdminWithdraws } from "../hooks/useWithdraws";
import type { AdminWithdrawRow, AdminWithdrawAction } from "../types";
import { useToast } from "@/components/ui";

// ISO 문자열을 "YYYY-MM-DD HH:mm" 포맷으로 변환하는 유틸
function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) {
    // 파싱 실패 시 원본 그대로 반환
    return dateString;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

// 현재 어떤 행에 대해 어떤 액션이 진행 중인지 표시하기 위한 상태 타입
type ActionState = {
  id: string | null; // 진행 중인 Tx ID (없으면 null)
  action: AdminWithdrawAction | null; // "approve" | "reject" | null
};

// 단일 출금 행(Row)을 렌더링하는 프레젠테이셔널 컴포넌트
type WithdrawRowProps = {
  row: AdminWithdrawRow; // 행 데이터
  disabled: boolean; // 버튼 비활성화 여부
  onClickApprove: () => void; // 승인 버튼 클릭 핸들러
  onClickReject: () => void; // 취소 버튼 클릭 핸들러
};

function WithdrawRow(props: WithdrawRowProps) {
  const { row, disabled, onClickApprove, onClickReject } = props;

  return (
    <tr>
      <td>{row.id}</td>
      <td>{row.username}</td>
      <td>{row.tokenCode}</td>
      <td>{row.amount}</td>
      <td>{row.withdrawAddress ?? "-"}</td>
      <td>{row.memo ?? "-"}</td>
      <td>{formatDate(row.createdAt)}</td>
      <td className="flex gap-2">
        <button
          type="button"
          className="btn btn-success btn-xs"
          disabled={disabled}
          onClick={onClickApprove}
        >
          승인
        </button>
        <button
          type="button"
          className="btn btn-error btn-xs"
          disabled={disabled}
          onClick={onClickReject}
        >
          취소
        </button>
      </td>
    </tr>
  );
}

// 출금 승인 대기 목록 페이지 뷰 컴포넌트
export default function WithdrawsPageView() {
  // 비즈니스 로직/데이터 로딩은 훅에서 담당
  const { loading, error, rows, refresh, handleAction } = useAdminWithdraws();
  // 토스트 훅 (variant: "error" 사용 가능)
  const { toast } = useToast();

  // 현재 어떤 행이 처리 중인지 표시하기 위한 로컬 상태
  const [actionState, setActionState] = useState<ActionState>({
    id: null,
    action: null,
  });

  // 승인/취소 버튼 클릭 시 공통 처리 로직
  const handleClick = async (rowId: string, action: AdminWithdrawAction) => {
    // 클릭된 행/액션을 상태에 기록 (버튼 disable 제어용)
    setActionState({ id: rowId, action });
    // 실제 처리 (API 호출) 수행
    const result = await handleAction(rowId, action);
    // 완료 후 상태 초기화
    setActionState({ id: null, action: null });

    // 성공인 경우
    if (result.ok) {
      const description =
        action === "approve"
          ? result.txHash
            ? `체인 전송이 완료되었습니다. txHash: ${result.txHash}`
            : "체인 전송이 완료되었습니다."
          : "요청이 취소되었습니다.";
      toast({
        title: "성공",
        description,
      });
    } else {
      // 실패인 경우 에러 토스트 표시
      toast({
        variant: "error",
        title: "오류",
        description: result.message,
      });
    }
  };

  // 각 행별로 버튼을 disable 할지 여부 계산
  // - 전체 로딩 중이면 전 행 disable
  // - 특정 행이 처리 중이면 해당 행만 disable
  const isRowDisabled = (rowId: string): boolean => {
    if (!actionState.id) {
      return loading;
    }
    return loading || actionState.id === rowId;
  };

  return (
    <div className="p-4 space-y-4">
      {/* 헤더 영역: 제목 + 새로고침 버튼 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">출금 승인 대기 목록</h1>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={refresh}
          disabled={loading}
        >
          새로고침
        </button>
      </div>

      {/* 에러 메시지 표시 */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* 전역 로딩 스피너 */}
      {loading && (
        <div className="flex items-center gap-2">
          <span className="loading loading-spinner" />
          <span>로딩 중...</span>
        </div>
      )}

      {/* 로딩이 아니고, 데이터가 없고, 에러도 없는 경우 → 비어 있음 안내 */}
      {!loading && rows.length === 0 && !error && (
        <div className="alert">
          <span>대기 중인 출금 요청이 없습니다.</span>
        </div>
      )}

      {/* 테이블 렌더링: PENDING 출금 요청이 하나 이상 있을 때 */}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>유저</th>
                <th>토큰</th>
                <th>수량</th>
                <th>출금 주소</th>
                <th>메모</th>
                <th>요청 시각</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <WithdrawRow
                  key={row.id}
                  row={row}
                  disabled={isRowDisabled(row.id)}
                  // 승인 클릭 시
                  onClickApprove={() => void handleClick(row.id, "approve")}
                  // 취소 클릭 시
                  onClickReject={() => void handleClick(row.id, "reject")}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
