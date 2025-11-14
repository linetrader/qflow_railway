// src/app/admin/users/tree/page.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui"; // 토스트만 사용

type Orientation = "vertical" | "horizontal";

const DEPTH_MIN = 1;
const DEPTH_MAX = 1000;
const LIMIT_MIN = 10;
const LIMIT_MAX = 1000;

export default function UserTreeSearchPage() {
  // 검색/표시 파라미터 (기본값)
  const [rootQ, setRootQ] = useState<string>("admin"); // username / referralCode / id
  const [maxDepth, setMaxDepth] = useState<number>(1000);
  const [limitPerLevel, setLimitPerLevel] = useState<number>(1000);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [initialDepth, setInitialDepth] = useState<number>(0); // 0=모두 펼침

  const { toast } = useToast();

  const disabled = useMemo(() => rootQ.trim().length === 0, [rootQ]);

  // 안전한 수치 클램프
  const clamp = (v: number, min: number, max: number): number =>
    Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;

  // 최종 전송값 계산
  const qsString = useMemo((): string => {
    const params = new URLSearchParams();
    params.set("root", rootQ.trim());
    params.set("maxDepth", String(clamp(maxDepth, DEPTH_MIN, DEPTH_MAX)));
    params.set(
      "limitPerLevel",
      String(clamp(limitPerLevel, LIMIT_MIN, LIMIT_MAX))
    );
    params.set("orientation", orientation);
    params.set(
      "initialDepth",
      String(initialDepth <= 0 ? 0 : clamp(initialDepth, DEPTH_MIN, DEPTH_MAX))
    );
    return params.toString();
  }, [rootQ, maxDepth, limitPerLevel, orientation, initialDepth]);

  const openTree = useCallback((): void => {
    if (disabled) {
      toast({
        title: "입력 필요",
        description: "루트 식별자(root)를 입력하세요.",
        variant: "error",
      });
      return;
    }
    window.open(`/tree-all?${qsString}`, "_blank", "noopener,noreferrer");
  }, [disabled, qsString, toast]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    openTree();
  };

  const resetDefaults = (): void => {
    setRootQ("admin");
    setMaxDepth(1000);
    setLimitPerLevel(1000);
    setOrientation("vertical");
    setInitialDepth(0);
    toast({ title: "초기화", description: "기본값으로 되돌렸습니다." });
  };

  return (
    <div className="space-y-6" data-theme="">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">유저 트리 검색</h1>
        </div>
        <div>
          <Link href="/admin/users" className="btn btn-outline">
            유저 목록으로
          </Link>
        </div>
      </div>

      {/* 검색 조건 카드 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">검색 조건</h2>

          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* 루트 */}
            <label className="form-control">
              <span className="label-text">
                루트 (username / referralCode / id)
              </span>
              <input
                type="text"
                className="input input-bordered"
                placeholder="예: admin"
                value={rootQ}
                onChange={(e) => setRootQ(e.target.value)}
                required
              />
            </label>

            {/* 최대 깊이 */}
            <label className="form-control">
              <span className="label-text">
                최대 깊이 ({DEPTH_MIN}~{DEPTH_MAX})
              </span>
              <input
                type="number"
                className="input input-bordered"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                min={DEPTH_MIN}
                max={DEPTH_MAX}
                inputMode="numeric"
              />
            </label>

            {/* 레벨당 제한 */}
            <label className="form-control">
              <span className="label-text">
                레벨당 제한 ({LIMIT_MIN}~{LIMIT_MAX})
              </span>
              <input
                type="number"
                className="input input-bordered"
                value={limitPerLevel}
                onChange={(e) => setLimitPerLevel(Number(e.target.value))}
                min={LIMIT_MIN}
                max={LIMIT_MAX}
                inputMode="numeric"
              />
            </label>

            {/* 표시 방향 */}
            <label className="form-control">
              <span className="label-text">표시 방향</span>
              <select
                className="select select-bordered"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as Orientation)}
              >
                <option value="vertical">Top → Down</option>
                <option value="horizontal">Left → Right</option>
              </select>
            </label>

            {/* 초기 접힘 깊이 */}
            <label className="form-control">
              <span className="label-text">
                초기 접힘 깊이 (0=모두 펼침, 최대 {DEPTH_MAX})
              </span>
              <input
                type="number"
                className="input input-bordered"
                value={initialDepth}
                onChange={(e) => setInitialDepth(Number(e.target.value))}
                min={0}
                max={DEPTH_MAX}
                inputMode="numeric"
              />
            </label>

            {/* 액션 영역 */}
            <div className="col-span-full flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={disabled}
              >
                트리보기
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={resetDefaults}
              >
                초기값으로
              </button>
              {/* 디버그용 쿼리 프리뷰가 필요하면 아래 주석 해제
              <code className="text-xs text-base-content/60 break-all">{qsString}</code>
              */}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
