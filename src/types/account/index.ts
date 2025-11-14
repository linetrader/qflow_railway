// src/types/account/index.ts

// 공통 UI
export type ToastKind = "info" | "success" | "warning" | "error";

/* ===========================
 * 공통 API 래퍼
 * =========================== */

/**
 * OK 응답
 * - 페이로드가 없을 때: ApiOk<void> === { ok: true }
 * - 페이로드가 있을 때: ApiOk<{ ... }> === { ok: true, ...payload }
 */
export type ApiOk<T = void> = Readonly<
  T extends void ? { ok: true } : { ok: true } & T
>;

export type ApiErr<C extends string = string> = Readonly<{
  ok: false;
  code: C;
  message?: string;
}>;

/** 통합 응답 */
export type ApiRes<T = void, C extends string = string> = ApiOk<T> | ApiErr<C>;

/* ===========================
 * 프로필 상태(프론트 상태용)
 * =========================== */
export type ProfileState = Readonly<{
  username: string;
  email: string;
  name: string;
  countryCode: string | null;
  countryName: string | null;
  wallet: string;
  refCode: string;
  otpEnabled: boolean;
  otpSecret: string;
  otpQr: string;
}>;

/* ===========================
 * Account GET
 * =========================== */

export type AccountGetOk = ApiOk<{
  profile: Readonly<{
    username: string;
    email: string;
    name: string;
    referralCode: string;
    googleOtpEnabled: boolean;
    country: Readonly<{ code: string; name: string }> | null;
    wallet: Readonly<{ withdrawAddress: string | null }>;
  }>;
}>;

export type AccountGetErrCode = "AUTH_REQUIRED" | "NOT_FOUND" | "UNKNOWN";
export type AccountGetErr = ApiErr<AccountGetErrCode>;

export type AccountGetResponse = ApiRes<
  { profile: AccountGetOk["profile"] },
  AccountGetErrCode
>;

/* ===========================
 * OTP
 * =========================== */

// init (페이로드 있음)
export type OtpInitOk = ApiOk<{
  secretBase32: string;
  otpauth: string;
}>;
export type OtpInitErrorCode =
  | "INVALID_INPUT"
  | "USER_NOT_FOUND"
  | "ALREADY_ENABLED"
  | "INIT_FAILED";
export type OtpInitErr = ApiErr<OtpInitErrorCode>;
export type OtpInitResponse = ApiRes<
  { secretBase32: string; otpauth: string },
  OtpInitErrorCode
>;

// register/disable (빈 페이로드)
export type OtpSimpleOk = ApiOk; // == ApiOk<void>
export type OtpSimpleErrCode =
  | "AUTH_REQUIRED"
  | "INVALID_INPUT"
  | "NOT_PROVISIONED"
  | "VERIFY_FAILED"
  | "REGISTER_FAILED";
export type OtpSimpleErr = ApiErr<OtpSimpleErrCode>;

export type OtpDisableResponse = ApiRes<void, OtpSimpleErrCode>;
export type OtpRegisterResponse = ApiRes<void, OtpSimpleErrCode>;

/* ===========================
 * 출금 지갑 주소 (GET/PUT)
 * =========================== */

// GET (페이로드 있음)
export type WalletWithdrawGetOk = ApiOk<{
  wallet: Readonly<{ withdrawAddress: string | null }>;
}>;
export type WalletWithdrawGetErrCode = "AUTH_REQUIRED" | "UNKNOWN";
export type WalletWithdrawGetErr = ApiErr<WalletWithdrawGetErrCode>;
export type WalletWithdrawGetResponse = ApiRes<
  { wallet: { withdrawAddress: string | null } },
  WalletWithdrawGetErrCode
>;

// PUT (페이로드 있음)
export type UpdateWalletOk = ApiOk<{
  wallet: Readonly<{ withdrawAddress: string }>;
}>;
export type UpdateWalletErrCode =
  | "AUTH_REQUIRED"
  | "INVALID_ADDRESS"
  | "INVALID_OTP"
  | "USER_NOT_FOUND"
  | "OTP_REQUIRED"
  | "NOT_PROVISIONED"
  | "OTP_VERIFY_FAILED"
  | "SAVE_FAILED";
export type UpdateWalletErr = ApiErr<UpdateWalletErrCode>;
export type UpdateWalletResponse = ApiRes<
  { wallet: { withdrawAddress: string } },
  UpdateWalletErrCode
>;

/* ===========================
 * Password change
 * =========================== */

export type PasswordChangeErrorCode =
  | "INVALID_INPUT"
  | "AUTH_REQUIRED"
  | "USER_NOT_FOUND"
  | "WRONG_PASSWORD"
  | "UPDATE_FAILED";

export type PasswordChangeOk = ApiOk; // == ApiOk<void>
export type PasswordChangeErr = ApiErr<PasswordChangeErrorCode>;
export type PasswordChangeResponse = ApiRes<void, PasswordChangeErrorCode>;

export type PasswordChangeBody = Readonly<{
  currentPassword: string;
  newPassword: string;
  /**
   * NOTE: 실제 운영에서는 세션으로 식별하세요.
   * 세션 방식 전환 전까지 예시 용도로만 email 허용.
   * 세션이 있다면 서버에서 무시하거나 검증에만 사용하세요.
   */
  email?: string;
}>;

/* ===========================
 * Type guards (선택)
 * =========================== */

export function isOk<T = void, C extends string = string>(
  r: ApiRes<T, C>
): r is ApiOk<T> {
  return r.ok === true;
}

export function isErr<T = void, C extends string = string>(
  r: ApiRes<T, C>
): r is ApiErr<C> {
  return r.ok === false;
}
