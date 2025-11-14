// src/lib/request-user.ts
import { headers } from "next/headers";

export type RequestUser = {
  userId: string | null;
  email: string | null;
  sessionJti: string | null;
};

/** 레벨만 필요할 때 */
export async function getUserLevel(): Promise<string | null> {
  try {
    const h = await headers(); // ✅ 프로젝트 컨벤션상 await 사용
    const v = h.get("x-user-level");
    // 필요 시 정규화(공백 제거). 숫자 형태라면 parse는 호출부에서 수행 권장.
    return v ? v.trim() : null;
  } catch {
    return null;
  }
}

/** 이메일만 필요할 때 */
export async function getUserEmail(): Promise<string | null> {
  try {
    const h = await headers(); // 프로젝트 설정 상 await 사용
    const v = h.get("x-user-email");
    return v ? v.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/** 사용자 ID만 필요할 때 */
export async function getUserId(): Promise<string | null> {
  try {
    const h = await headers(); // ✅ await 필요
    return h.get("x-user-id");
  } catch {
    return null;
  }
}

/** 여러 값을 한 번에 */
export async function getRequestUser(): Promise<RequestUser> {
  try {
    const h = await headers(); // ✅ await 필요
    return {
      userId: h.get("x-user-id"),
      email: h.get("x-user-email"),
      sessionJti: h.get("x-session-jti"),
    };
  } catch {
    return { userId: null, email: null, sessionJti: null };
  }
}
