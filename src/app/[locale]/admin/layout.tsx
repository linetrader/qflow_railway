// app/[locale]/admin/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "./components/AdminSidebar";

const DRAWER_ID = "admin-drawer";
const NAV_H_PX = 48;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const h = await headers();

  // 미들웨어(+기존 인증 미들웨어)가 셋업한 헤더를 그대로 이용
  const levelStr = h.get("x-user-level");
  const level = Number.isFinite(Number(levelStr)) ? Number(levelStr) : 0;
  const isAdmin = level >= 21;

  if (!isAdmin) {
    let back = "/";
    try {
      const ref = h.get("referer");
      if (ref) {
        const u = new URL(ref);
        back = u.pathname + u.search || "/";
      }
    } catch {
      /* noop */
    }
    redirect(back);
  }

  return (
    <div className="drawer lg:drawer-open min-h-dvh bg-base-200 text-base-content">
      <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        <div className="lg:hidden sticky top-0 z-20 bg-base-100/90 backdrop-blur border-b">
          <div className="navbar min-h-12 px-2" style={{ height: NAV_H_PX }}>
            <div className="flex-1">
              <label
                htmlFor={DRAWER_ID}
                aria-label="open sidebar"
                className="btn btn-ghost btn-sm"
              >
                ☰
              </label>
            </div>
            <div className="flex-none px-2 text-sm font-semibold">Admin</div>
          </div>
        </div>
        <main id="main" role="main" className="px-3 py-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <div className="drawer-side z-40 lg:z-0">
        <label
          htmlFor={DRAWER_ID}
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <aside
          className="w-72 max-w-[80vw] bg-base-100 border-r min-h-dvh"
          style={{
            paddingTop: `calc(${NAV_H_PX}px + env(safe-area-inset-top))`,
          }}
        >
          <div className="lg:pt-0 p-3">
            <div className="mb-2 text-sm font-semibold">어드민</div>
            <nav className="menu p-0">
              <AdminSidebar />
            </nav>
            <div className="mt-3 text-xs text-base-content/60">© Admin</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
