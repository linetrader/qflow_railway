"use client";

import { useRef } from "react";

export interface ImageUploadButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "onClick"
  > {
  /** 파일 선택 후 콜백 (필수) */
  onPick: (files: FileList) => void;
  /** 버튼 라벨 (기본: "이미지 선택") */
  label?: string;
  /** input accept 속성 (기본: 이미지 확장자) */
  accept?: string;
  /** 여러 개 선택 허용 */
  multiple?: boolean;
  /** 선택된 파일 개수를 표시하고 싶을 때 */
  selectedCount?: number;
}

/**
 * daisyUI 기반 이미지 업로드 버튼
 * - 커스텀 UI 컴포넌트 의존성 제거 (Badge/Button)
 * - any/ReactNode/JSX.Element 미사용
 */
export default function ImageUploadButton(props: ImageUploadButtonProps) {
  const {
    onPick,
    label = "이미지 선택",
    accept = "image/png,image/jpeg,image/webp,image/gif",
    multiple = false,
    selectedCount,
    disabled,
    className,
    ...rest
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      onPick(files);
      // 동일 파일 다시 선택 가능하도록 value 초기화
      e.currentTarget.value = "";
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {/* 트리거 버튼 (daisyUI) */}
      <button
        type="button"
        className={[
          "btn",
          "btn-sm",
          disabled ? "btn-disabled" : "",
          className ?? "",
        ]
          .join(" ")
          .trim()}
        onClick={openPicker}
        disabled={disabled}
        {...rest}
      >
        {label}
      </button>

      {/* 선택 개수 뱃지 (daisyUI) */}
      {typeof selectedCount === "number" ? (
        <span className="badge">{selectedCount}</span>
      ) : null}

      {/* 숨김 파일 입력 */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
