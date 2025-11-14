// src/components/ui/field/PasswordField.tsx
"use client";

import React from "react";

export type AutoCompletePw = "current-password" | "new-password";
export type PasswordFieldSize = "sm" | "md" | "lg";

export type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean | ((prev: boolean) => boolean)) => void;
  autoComplete: AutoCompletePw;

  name?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: PasswordFieldSize;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  ariaDescribedById?: string;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  setShow,
  autoComplete,
  name,
  placeholder = "password",
  disabled = false,
  size = "md",
  className,
  inputClassName,
  buttonClassName,
  ariaDescribedById,
}: PasswordFieldProps) {
  const toggle = React.useCallback(() => setShow((s) => !s), [setShow]);

  const sizeClass =
    size === "sm" ? "input-sm" : size === "lg" ? "input-lg" : "";
  const btnSizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";

  return (
    <label
      className={`form-control w-full gap-0.5 mb-1 ${className ?? ""}`}
      htmlFor={id}
    >
      <div className="label py-0.5">
        <span className="label-text">{label}</span>
      </div>
      <div className="join w-full flex-nowrap">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          className={`input input-bordered join-item w-full flex-1 ${sizeClass} ${
            inputClassName ?? ""
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-required="true"
          aria-describedby={ariaDescribedById}
          disabled={disabled}
        />
        <button
          type="button"
          className={`btn btn-ghost join-item ${btnSizeClass} ${
            buttonClassName ?? ""
          }`}
          onClick={toggle}
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide password" : "Show password"}
          disabled={disabled}
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>
    </label>
  );
}

export default PasswordField;
