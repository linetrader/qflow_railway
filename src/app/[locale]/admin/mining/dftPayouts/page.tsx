"use client";

// 페이지: 렌더링과 연산 분리 — 뷰는 view/, 데이터는 hooks/
import DftPayoutsView from "./view/DftPayoutsView";
import { useDftPayouts } from "./hooks/useDftPayouts";

export default function Page() {
  const vm = useDftPayouts();
  return <DftPayoutsView {...vm} />;
}
