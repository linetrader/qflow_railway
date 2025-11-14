// src/app/admin/users/bulk-signup/view/SettingsForm.tsx
"use client";

import Link from "next/link";

type Props = {
  // 값
  start: number;
  end: number;
  count: number;
  prefix: string;
  pad: number;
  root: string;
  password: string;
  country: string;
  dry: boolean;
  bcryptCost: number;
  delayMs: number;

  parentLevel: number;
  attachPerParent: number;
  parentFilterPrefix: string;
  parentLimit: number;

  // 핸들러
  onStart: (v: number) => void;
  onEnd: (v: number) => void;
  onCount: (v: number) => void;
  onPrefix: (v: string) => void;
  onPad: (v: number) => void;
  onRoot: (v: string) => void;
  onPassword: (v: string) => void;
  onCountry: (v: string) => void;
  onDry: (v: boolean) => void;
  onBcryptCost: (v: number) => void;
  onDelayMs: (v: number) => void;

  onParentLevel: (v: number) => void;
  onAttachPerParent: (v: number) => void;
  onParentFilterPrefix: (v: string) => void;
  onParentLimit: (v: number) => void;

  // 상태
  submitting: boolean;
  onSubmit: () => void;
  validationError?: string;
};

export function SettingsForm(props: Props) {
  const {
    start,
    end,
    count,
    prefix,
    pad,
    root,
    password,
    country,
    dry,
    bcryptCost,
    delayMs,
    parentLevel,
    attachPerParent,
    parentFilterPrefix,
    parentLimit,
    onStart,
    onEnd,
    onCount,
    onPrefix,
    onPad,
    onRoot,
    onPassword,
    onCountry,
    onDry,
    onBcryptCost,
    onDelayMs,
    onParentLevel,
    onAttachPerParent,
    onParentFilterPrefix,
    onParentLimit,
    submitting,
    onSubmit,
    validationError,
  } = props;

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h3 className="card-title">설정</h3>

        <p className="mb-4 text-sm text-base-content/70">
          <b>모드 안내</b>
          <br />- <b>범위 모드</b>: start..end 지정
          <br />- <b>수량 모드</b>: start=0, end=0 이면 count 사용
          <br />- <b>특정 레벨 부모 모드</b>: parentLevel &gt; 0 AND
          attachPerParent &gt; 0
        </p>

        {validationError ? (
          <div className="alert alert-warning mb-2">
            <span className="font-medium">유효성 경고</span>
            <span>{validationError}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* 범위/수량 공통 */}
          <label className="form-control">
            <span className="label-text">시작 번호 (start)</span>
            <input
              type="number"
              className="input input-bordered"
              value={start}
              min={0}
              onChange={(e) => onStart(Number(e.target.value))}
            />
          </label>

          <label className="form-control">
            <span className="label-text">끝 번호 (end)</span>
            <input
              type="number"
              className="input input-bordered"
              value={end}
              min={0}
              onChange={(e) => onEnd(Number(e.target.value))}
            />
          </label>

          <label className="form-control">
            <span className="label-text">
              생성 수량 (count) — start=0, end=0일 때 사용
            </span>
            <input
              type="number"
              className="input input-bordered"
              value={count}
              min={1}
              onChange={(e) => onCount(Number(e.target.value))}
            />
          </label>

          {/* 공통 파라미터 */}
          <label className="form-control">
            <span className="label-text">아이디 prefix</span>
            <input
              type="text"
              className="input input-bordered"
              value={prefix}
              onChange={(e) => onPrefix(e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text">zero pad (예: 3 → test001)</span>
            <input
              type="number"
              className="input input-bordered"
              value={pad}
              min={0}
              onChange={(e) => onPad(Number(e.target.value))}
            />
          </label>

          <label className="form-control">
            <span className="label-text">
              루트 추천인 (username 또는 referralCode)
            </span>
            <input
              type="text"
              className="input input-bordered"
              value={root}
              onChange={(e) => onRoot(e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text">기본 비밀번호</span>
            <input
              type="password"
              className="input input-bordered"
              value={password}
              onChange={(e) => onPassword(e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text">
              국가 코드 (선택, ISO-3166-1 alpha-2)
            </span>
            <input
              type="text"
              className="input input-bordered"
              value={country}
              onChange={(e) => onCountry(e.target.value)}
              placeholder="KR, US, ..."
            />
          </label>

          <label className="form-control">
            <span className="label-text">드라이런 (DB 쓰기 없음)</span>
            <input
              type="checkbox"
              className="toggle"
              checked={dry}
              onChange={(e) => onDry((e.target as HTMLInputElement).checked)}
            />
          </label>

          <label className="form-control">
            <span className="label-text">bcrypt cost (4..15)</span>
            <input
              type="number"
              className="input input-bordered"
              value={bcryptCost}
              min={4}
              max={15}
              onChange={(e) => onBcryptCost(Number(e.target.value))}
            />
          </label>

          <label className="form-control">
            <span className="label-text">delay(ms) between creations</span>
            <input
              type="number"
              className="input input-bordered"
              value={delayMs}
              min={0}
              onChange={(e) => onDelayMs(Number(e.target.value))}
            />
          </label>

          {/* 특정 레벨 부모 모드 */}
          <div className="col-span-full mt-2 text-sm font-medium">
            특정 레벨 부모 모드
          </div>

          <label className="form-control">
            <span className="label-text">
              부모 레벨 (parentLevel) — 0이면 미사용
            </span>
            <input
              type="number"
              className="input input-bordered"
              value={parentLevel}
              min={0}
              onChange={(e) => onParentLevel(Number(e.target.value))}
            />
          </label>

          <label className="form-control">
            <span className="label-text">
              부모당 생성 인원 (attachPerParent)
            </span>
            <input
              type="number"
              className="input input-bordered"
              value={attachPerParent}
              min={0}
              onChange={(e) => onAttachPerParent(Number(e.target.value))}
            />
          </label>

          <label className="form-control">
            <span className="label-text">
              부모 필터(선택): username startsWith
            </span>
            <input
              type="text"
              className="input input-bordered"
              value={parentFilterPrefix}
              onChange={(e) => onParentFilterPrefix(e.target.value)}
              placeholder="예: test"
            />
          </label>

          <label className="form-control">
            <span className="label-text">부모 최대 수(parentLimit)</span>
            <input
              type="number"
              className="input input-bordered"
              value={parentLimit}
              min={1}
              onChange={(e) => onParentLimit(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={`btn btn-primary ${submitting ? "loading" : ""}`}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "실행 중…" : "대량 생성 실행"}
          </button>
          <Link href="/admin/users" className="btn btn-outline">
            취소
          </Link>
        </div>
      </div>
    </div>
  );
}
