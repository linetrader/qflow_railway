// src/app/admin/components/padClass.ts
export function padClass(depth = 0) {
  const n = Math.min(6 + depth * 2, 10);
  const map: Record<number, string> = {
    6: "pl-6",
    8: "pl-8",
    10: "pl-10",
  };
  // 범위 외 값은 가장 가까운 키로 스냅
  const key = [6, 8, 10].sort((a, b) => Math.abs(a - n) - Math.abs(b - a))[0];
  return map[key];
}
