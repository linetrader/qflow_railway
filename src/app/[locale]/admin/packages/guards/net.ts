export function isAbortError(e: unknown): boolean {
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    return e.name === "AbortError";
  }
  if (e && typeof e === "object" && "name" in e) {
    const n = (e as { name?: unknown }).name;
    return n === "AbortError";
  }
  return false;
}
