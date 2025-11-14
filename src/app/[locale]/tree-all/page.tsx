// app/tree-all/page.tsx
import { Suspense } from "react";
import TreeAllClient from "./tree-all-client";

export default function TreeAllPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center p-6 text-sm text-gray-500">로딩 중…</div>
      }
    >
      <TreeAllClient />
    </Suspense>
  );
}
