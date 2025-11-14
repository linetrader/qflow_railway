"use client";

export default function UserPackageFiltersView(props: {
  initial: {
    username: string;
    countryCode: string;
    levelMin: string;
    levelMax: string;
    packageId: string;
    packageNameContains: string;
    createdFrom: string;
    createdTo: string;
    pageSize: string;
  };
  onSubmit: (formData: FormData) => void;
  onReset: () => void;
}) {
  const { initial, onSubmit, onReset } = props;

  return (
    <form
      action={onSubmit}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <FieldText
        name="username"
        label="아이디"
        placeholder="예) alice"
        defaultValue={initial.username}
      />
      <FieldText
        name="countryCode"
        label="국가코드"
        placeholder="예) KR"
        defaultValue={initial.countryCode}
        maxLength={2}
      />
      <FieldText
        name="levelMin"
        label="레벨 최소"
        placeholder="예) 1"
        defaultValue={initial.levelMin}
        inputMode="numeric"
      />
      <FieldText
        name="levelMax"
        label="레벨 최대"
        placeholder="예) 10"
        defaultValue={initial.levelMax}
        inputMode="numeric"
      />

      <FieldText
        name="packageId"
        label="패키지 ID"
        placeholder="예) pkg_123"
        defaultValue={initial.packageId}
      />
      <FieldText
        name="packageNameContains"
        label="패키지명 포함"
        placeholder="예) Starter"
        defaultValue={initial.packageNameContains}
      />

      <FieldDate
        name="createdFrom"
        label="생성일 From"
        defaultValue={initial.createdFrom}
      />
      <FieldDate
        name="createdTo"
        label="생성일 To"
        defaultValue={initial.createdTo}
      />

      <label className="form-control">
        <select
          name="pageSize"
          defaultValue={initial.pageSize}
          className="select select-bordered"
        >
          <option value="10">10개</option>
          <option value="20">20개</option>
          <option value="50">50개</option>
          <option value="100">100개</option>
          <option value="200">200개</option>
        </select>
      </label>

      <div className="col-span-full flex gap-2 pt-1">
        <button type="submit" className="btn btn-primary">
          검색
        </button>
        <button type="button" className="btn btn-outline" onClick={onReset}>
          초기화
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
  maxLength?: number;
  inputMode?:
    | "text"
    | "numeric"
    | "decimal"
    | "search"
    | "tel"
    | "email"
    | "url";
}) {
  const { name, label, placeholder, defaultValue, maxLength, inputMode } =
    props;
  return (
    <label className="form-control">
      <span className="label-text">{label}</span>
      <input
        name={name}
        type="text"
        className="input input-bordered"
        placeholder={placeholder}
        defaultValue={defaultValue}
        maxLength={maxLength}
        inputMode={inputMode}
      />
    </label>
  );
}

function FieldDate(props: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const { name, label, defaultValue } = props;
  return (
    <label className="form-control">
      <span className="label-text">{label}</span>
      <input
        name={name}
        type="date"
        className="input input-bordered"
        defaultValue={defaultValue}
      />
    </label>
  );
}
