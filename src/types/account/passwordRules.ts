// ──────────────────────────────────────────────────────────────────────────────
// File: /src/lib/passwordRules.ts
// (클라이언트/서버 공통 사용 가능: 비밀번호 규칙 검증 전용)
// ──────────────────────────────────────────────────────────────────────────────
export type PasswordRuleResult = {
  pwLenOk: boolean;
  pwHasLetter: boolean;
  pwHasDigit: boolean;
  pwHasUpper: boolean;
  pwHasSymbol: boolean;
};

export function checkPasswordRules(pw: string): PasswordRuleResult {
  const pwLenOk = pw.length >= 8 && pw.length <= 18;
  const pwHasLetter = /[A-Za-z]/.test(pw);
  const pwHasDigit = /\d/.test(pw);
  const pwHasUpper = /[A-Z]/.test(pw);
  const pwHasSymbol = /[^A-Za-z0-9]/.test(pw);
  return { pwLenOk, pwHasLetter, pwHasDigit, pwHasUpper, pwHasSymbol };
}

export function isPasswordStrong(pw: string): boolean {
  const r = checkPasswordRules(pw);
  return (
    r.pwLenOk && r.pwHasLetter && r.pwHasDigit && r.pwHasUpper && r.pwHasSymbol
  );
}
