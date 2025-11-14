// src/app/admin/wallets/worker/page.tsx
import AdminWorkerControl from "./AdminWorkerControl";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">지갑 워커 제어</h1>
      <AdminWorkerControl />
    </div>
  );
}
