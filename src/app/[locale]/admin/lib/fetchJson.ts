// src/app/admin/lib/fetchJson.ts
type ErrorBody = { error: string };

function isErrorBody(x: unknown): x is ErrorBody {
  if (typeof x !== "object" || x === null) return false;
  const error = (x as { error?: unknown }).error;
  return typeof error === "string";
}

export async function safeJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json(); // 런타임 파싱 → unknown
  } catch {
    return null;
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const body = await safeJson(res);

  if (!res.ok) {
    const msg = isErrorBody(body) ? body.error : `HTTP_${res.status}`;
    throw new Error(msg);
  }

  if (body == null) {
    throw new Error("INVALID_RESPONSE");
  }
  return body as T; // 호출부에서 T로 사용 (런타임 검증은 호출부 책임)
}
