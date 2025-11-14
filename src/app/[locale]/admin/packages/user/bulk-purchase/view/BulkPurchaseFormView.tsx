"use client";

import type { PackageBrief } from "@/types/admin/packages/user/packages-bulk";

export default function BulkPurchaseFormView(props: {
  onSubmit: (fd: FormData) => void | Promise<void>;
  packages: PackageBrief[];
  selectedPackageId: string;
  setSelectedPackageId: (id: string) => void;
  pkSelectDisabled: boolean;
  submitting: boolean;
  pkLoading: boolean;
  pkError: string | null;
}) {
  const {
    onSubmit,
    packages,
    selectedPackageId,
    setSelectedPackageId,
    pkSelectDisabled,
    submitting,
    pkLoading,
    pkError,
  } = props;

  return (
    <form
      action={onSubmit}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <FieldText
        name="prefix"
        label="접두어"
        placeholder="예) test"
        defaultValue="test"
      />
      <FieldText
        name="pad"
        label="자리수"
        placeholder="예) 3"
        inputMode="numeric"
        defaultValue="3"
      />
      <FieldText
        name="limit"
        label="최대 대상 수 (safety)"
        placeholder="예) 1000"
        inputMode="numeric"
        defaultValue="1000"
      />
      <FieldText
        name="start"
        label="시작 번호"
        placeholder="예) 1"
        inputMode="numeric"
      />
      <FieldText
        name="end"
        label="끝 번호"
        placeholder="예) 50"
        inputMode="numeric"
      />

      <FieldText
        name="items"
        label="아이템 목록(CSV)"
        placeholder="예) <PID_A>:2,<PID_B>:1"
        className="lg:col-span-2"
      />
      <div className="text-xs opacity-70 lg:col-span-1">
        ※ <code>items</code>에 값을 입력하면 아래 선택은 무시됩니다.
      </div>

      <div className="lg:col-span-2">
        <label className="form-control">
          <span className="label-text">단일 패키지 선택</span>
          <select
            name="packageId"
            className="select select-bordered"
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.currentTarget.value)}
            disabled={pkSelectDisabled}
          >
            {pkLoading && <option>불러오는 중…</option>}
            {pkError && <option>패키지 로드 오류</option>}
            {!pkLoading &&
              !pkError &&
              packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            {!pkLoading && !pkError && packages.length === 0 && (
              <option>패키지가 없습니다</option>
            )}
          </select>
        </label>
      </div>

      <FieldText
        name="units"
        label="단일 units"
        placeholder="기본 1"
        inputMode="numeric"
        defaultValue="1"
      />

      <label className="label cursor-pointer gap-2">
        <input type="checkbox" name="dry" className="checkbox checkbox-sm" />
        <span className="label-text">Dry run (대상만 미리 확인)</span>
      </label>

      <div className="col-span-full pt-1">
        <button
          type="submit"
          className={`btn btn-primary ${submitting ? "loading" : ""}`}
        >
          {submitting ? "처리 중…" : "실행"}
        </button>
      </div>
    </form>
  );
}

function FieldText(props: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  inputMode?:
    | "text"
    | "numeric"
    | "decimal"
    | "search"
    | "tel"
    | "email"
    | "url";
}) {
  const { name, label, placeholder, defaultValue, className, inputMode } =
    props;
  return (
    <label className={`form-control ${className ?? ""}`}>
      <span className="label-text">{label}</span>
      <input
        name={name}
        type="text"
        className="input input-bordered"
        placeholder={placeholder}
        defaultValue={defaultValue}
        inputMode={inputMode}
      />
    </label>
  );
}
