// src/types/site/auth/index.ts
import { z } from "zod";

/** 공용 에러 코드 */
export type ApiErrCode =
  | "USERNAME_TAKEN"
  | "EMAIL_TAKEN"
  | "REFERRER_NOT_FOUND"
  | "SPONSOR_NOT_FOUND"
  | "COUNTRY_CODE_INVALID"
  | "COUNTRY_NOT_FOUND"
  | "GROUP_NO_WITHOUT_REFERRER"
  | "DEFAULT_REFERRER_NOT_READY"
  | "ADMIN_SIGNUP_REFERRER_FORBIDDEN"
  | "INVALID_REQUESTED_GROUP_NO"
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "UNKNOWN";

/** ===== 로그인 ===== */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(4)
    .max(16)
    .regex(/^[a-z0-9_]+$/),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginRequest = LoginInput;
export type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "UNKNOWN";

export type LoginOk = {
  ok: true;
  user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    referrer: string | null;
    sponsor: string | null;
    createdAt: string | Date;
  };
};
export type LoginErr = { ok: false; code: ApiErrCode; message?: string };
export type LoginResponse = LoginOk | LoginErr;
export function isLoginResponse(x: unknown): x is LoginResponse {
  return typeof x === "object" && x !== null && "ok" in x;
}

/** ===== 회원가입 ===== */
export const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(4)
    .max(16)
    .regex(/^[a-z0-9_]+$/),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8)
    .max(18)
    .refine((v) => /[A-Za-z]/.test(v), "mustContainLetter")
    .refine((v) => /\d/.test(v), "mustContainDigit")
    .refine((v) => /[A-Z]/.test(v), "mustContainUpper")
    .refine((v) => /[^A-Za-z0-9]/.test(v), "mustContainSymbol"),
  name: z.string().trim().min(1),
  /** ✅ 필수 */
  referrer: z.string().trim().min(1),
  sponsor: z.string().trim().optional().nullable(),
  countryCode: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (v) =>
        v === null || v === undefined || v === "" || /^[A-Za-z]{2}$/.test(v),
      "invalidCountry"
    ),
  groupNo: z.number().int().min(1).optional().nullable(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export type SignupOk = {
  ok: true;
  user: {
    id: string;
    username: string;
    email: string;
    name: string;
    countryCode: string | null;
    referrerId: string;
    sponsorId: string | null;
    referralCode: string;
    createdAt: string | Date;
  };
};
export type SignupErr = { ok: false; code: ApiErrCode; message?: string };
export type SignupResponse = SignupOk | SignupErr;

/** 훅에서 합성해 쓰는 타입 */
export type RefStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; username: string }
  | { state: "not_found" }
  | { state: "error" };
export type RefStatusUI = "ok" | "fail" | null;
export type SubmitResult =
  | { ok: true }
  | { ok: false; code: ApiErrCode; message?: string };
export type ApiRes = SignupResponse;

/** 폼 상태 타입 (훅/뷰 공통) */
export type FormState = {
  username: string;
  email: string;
  password: string;
  password2: string;
  name: string;
  referrer: string;
  sponsor: string;
  countryCode: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
};

// src/types/auth/account.ts

/** 로그인된 사용자 요약 정보 */
export type MeLite = {
  username: string;
  referralCode: string;
};

/** 성공 응답 */
export type AccountOk = {
  ok: true;
  profile: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    referralCode: string;
    googleOtpEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    country: {
      code: string;
      name: string;
    } | null;
    wallet: {
      withdrawAddress: string | null;
    };
  };
};

/** 에러 코드 정의 */
export type AccountErrorCode =
  | "UNAUTH"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "UNKNOWN";

/** 실패 응답 */
export type AccountErr = {
  ok: false;
  code: AccountErrorCode;
  message?: string;
};

/** 최종 통합 타입 */
export type AccountRes = AccountOk | AccountErr;

/** resolve-user 응답 */
export type ResolveUserResponse = {
  ok: boolean;
  user?: { id: string; username?: string } | undefined;
};

/** 국가 옵션 */
export type CountryOption = { value: string; label: string };
export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: "", label: "country code" },
  { value: "KR", label: "Korea, Republic of (KR)" },
  { value: "US", label: "United States (US)" },
  { value: "JP", label: "Japan (JP)" },
  { value: "SG", label: "Singapore (SG)" },
  { value: "DE", label: "Germany (DE)" },
  { value: "FR", label: "France (FR)" },
  { value: "GB", label: "United Kingdom (GB)" },
  { value: "VN", label: "Viet Nam (VN)" },
  { value: "TH", label: "Thailand (TH)" },
  { value: "PH", label: "Philippines (PH)" },
  { value: "ID", label: "Indonesia (ID)" },
  { value: "MY", label: "Malaysia (MY)" },
  { value: "AU", label: "Australia (AU)" },
  { value: "CA", label: "Canada (CA)" },
  { value: "BR", label: "Brazil (BR)" },
  { value: "IN", label: "India (IN)" },
  { value: "TR", label: "Türkiye (TR)" },
  { value: "AE", label: "United Arab Emirates (AE)" },
];
