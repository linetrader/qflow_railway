// src/app/api/utils/withTimeout.ts

/** 504 판별용 고정 코드 */
export const UPSTREAM_TIMEOUT_CODE = "UPSTREAM_TIMEOUT";

/** 서버 사이드 타임아웃 전용 에러 타입 */
export class UpstreamTimeoutError extends Error {
  public readonly code = UPSTREAM_TIMEOUT_CODE;
  public readonly label: string;
  public readonly ms: number;

  constructor(label: string, ms: number) {
    super(`${UPSTREAM_TIMEOUT_CODE}:${label}`);
    this.name = "UpstreamTimeoutError";
    this.label = label;
    this.ms = ms;
  }
}

/** 에러가 UpstreamTimeoutError 인지 판별 */
export function isUpstreamTimeout(e: unknown): e is UpstreamTimeoutError {
  return (
    e instanceof UpstreamTimeoutError ||
    (typeof e === "object" &&
      e !== null &&
      "message" in e &&
      typeof (e as { message: unknown }).message === "string" &&
      String((e as { message: string }).message).startsWith(
        `${UPSTREAM_TIMEOUT_CODE}:`
      ))
  );
}

/**
 * Promise에 타임아웃을 적용해 주는 래퍼
 * - 지정한 ms 안에 resolve되지 않으면 UpstreamTimeoutError throw
 */
export function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const to = setTimeout(
      () => reject(new UpstreamTimeoutError(label, ms)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(to);
        resolve(v);
      },
      (e) => {
        clearTimeout(to);
        reject(e);
      }
    );
  });
}

/**
 * Promise.all(promises)에 타임아웃을 적용
 * - 모든 작업을 병렬 수행하며, ms를 초과하면 UpstreamTimeoutError
 */
export function allWithTimeout<T>(
  promises: Promise<T>[],
  ms: number,
  label: string
): Promise<T[]> {
  return withTimeout(Promise.all(promises), ms, label);
}

/** Next.js 라우트에서 적절한 HTTP 상태코드 선택 (504 또는 500) */
export function statusFromError(e: unknown): number {
  return isUpstreamTimeout(e) ? 504 : 500;
}

/** 에러 메시지 추출(로그/응답용) */
export function messageFromError(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return "UNKNOWN_ERROR";
  }
}
