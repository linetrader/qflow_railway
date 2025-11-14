// src/app/admin/users/gaurd/deleteGuards.ts
export function okGuard(x: unknown): x is { ok: true; deleted: number } {
  return (
    typeof x === "object" &&
    x !== null &&
    "ok" in x &&
    "deleted" in x &&
    (x as { ok: unknown }).ok === true &&
    typeof (x as { deleted: unknown }).deleted === "number"
  );
}

export function errGuard(x: unknown): x is { ok: false; error: string } {
  return (
    typeof x === "object" &&
    x !== null &&
    "ok" in x &&
    "error" in x &&
    (x as { ok: unknown }).ok === false &&
    typeof (x as { error: unknown }).error === "string"
  );
}
