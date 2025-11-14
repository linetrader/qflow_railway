export function isAbortError(e: unknown): boolean {
  // 표준 DOMException
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    return e.name === "AbortError";
  }
  // 일부 런타임(노드/폴리필)에서 name만 제공되는 경우
  if (e && typeof e === "object" && "name" in e) {
    const name = (e as { name: unknown }).name;
    return name === "AbortError";
  }
  return false;
}
