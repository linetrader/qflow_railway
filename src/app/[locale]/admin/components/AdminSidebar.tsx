// src/app/admin/components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
//import { useToast } from "@/components/ui";

/* ---------------------- 타입 & 데이터 ---------------------- */
type NavNode = {
  label: string;
  href?: string;
  children?: NavNode[];
};

const navTree: NavNode[] = [
  { label: "대시보드", href: "/admin" },
  {
    label: "유저 관리",
    children: [
      { label: "유저 목록", href: "/admin/users" },
      { label: "유저 트리", href: "/admin/users/tree" },
      { label: "센터 지정", href: "/admin/centers" },
    ],
  },
  {
    label: "지갑 관리",
    children: [
      { label: "지갑 현황", href: "/admin/wallets" },
      { label: "출금 현황", href: "/admin/wallets/withdraws" },
      { label: "회사 지갑", href: "/admin/wallets/admin-wallet" },
      { label: "스케줄러 제어", href: "/admin/wallets/worker" },
    ],
  },
  {
    label: "패키지 관리",
    children: [
      { label: "패키지 목록", href: "/admin/packages" },
      { label: "패키지 유저 목록", href: "/admin/packages/user" },
      { label: "패키지 구매 내역", href: "/admin/packages/history" },
    ],
  },
  {
    label: "게시판 관리",
    children: [
      { label: "공지사항", href: "/admin/boards/announcements" },
      { label: "이벤트", href: "/admin/boards/events" },
    ],
  },
  {
    label: "Level 정책",
    children: [
      { label: "정책 목록", href: "/admin/level/policies" },
      { label: "스케줄러 제어", href: "/admin/level/worker" },
    ],
  },
  // {
  //   label: "Center 정책",
  //   children: [
  //     { label: "센터 지정", href: "/admin/centers" },
  //     // { label: "스케줄러 제어", href: "/admin/Centers/worker" },
  //   ],
  // },
  {
    label: "마이닝",
    children: [
      { label: "정책 목록", href: "/admin/mining/policies" },
      { label: "DFT 지급 내역", href: "/admin/mining/dftPayouts" },
      // { label: "MLM 추천 플랜", href: "/admin/mining/mlm-plans" },
      // { label: "MLM 플랜 레벨", href: "/admin/mining/mlm-plan-levels" },
      // { label: "레벨 보너스 플랜", href: "/admin/mining/level-bonus-plans" },
      // { label: "보너스 플랜 항목", href: "/admin/mining/level-bonus-items" },
      // { label: "실행 로그", href: "/admin/mining/runs" },
      // { label: "분배 내역", href: "/admin/mining/payouts" },
      { label: "스케줄러 제어", href: "/admin/mining/scheduler" },
    ],
  },
  // {
  //   label: "추천/MLM",
  //   children: [
  //     { label: "추천 트리(엣지)", href: "/admin/referral/edges" },
  //     { label: "그룹 요약", href: "/admin/referral/group-summary" },
  //     { label: "유저별 통계", href: "/admin/referral/stats" },
  //     { label: "추천 플랜", href: "/admin/referral/plans" },
  //     { label: "추천 플랜 레벨", href: "/admin/referral/plan-levels" },
  //     { label: "커미션 현황", href: "/admin/referral/commissions" },
  //     { label: "보상 요약", href: "/admin/users-reward-summary" },
  //     { label: "보상 내역", href: "/admin/users-rewards" },
  //     { label: "커미션 내역", href: "/admin/users-commissions" },
  //   ],
  // },
  // {
  //   label: "토큰/거래",
  //   children: [
  //     { label: "토큰 목록", href: "/admin/tokens" },
  //     { label: "코인 가격", href: "/admin/coin-prices" },
  //     { label: "지갑 트랜잭션", href: "/admin/wallet-txs" },
  //   ],
  // },
  // {
  //   label: "리포트/설정",
  //   children: [
  //     { label: "대시보드 리포트", href: "/admin/reports" },
  //     { label: "국가 관리", href: "/admin/settings/countries" },
  //     { label: "시스템 설정", href: "/admin/settings" },
  //   ],
  // },
];

/* ---------------------- 유틸 ---------------------- */
function normalizePath(s: string) {
  return s.replace(/\/+$/, "") || "/";
}
function isActivePath(pathname: string | null, href?: string): boolean {
  if (!href || !pathname) return false;
  return normalizePath(pathname) === normalizePath(href);
}
function anyChildActive(pathname: string | null, node: NavNode): boolean {
  if (isActivePath(pathname, node.href)) return true;
  if (node.children && node.children.length > 0) {
    for (const c of node.children) {
      if (anyChildActive(pathname, c)) return true;
    }
  }
  return false;
}
function nodeKey(prefix: string[], node: NavNode) {
  return [...prefix, node.label].join(" / ");
}
function depthPaddingClass(depth: number): string {
  if (depth <= 0) return "pl-4";
  if (depth === 1) return "pl-6";
  return "pl-8";
}

/* ---------------------- 하위 컴포넌트 ---------------------- */
function Leaf({
  node,
  active,
  depth = 0,
}: {
  node: NavNode;
  active: boolean;
  depth?: number;
}) {
  const pad = depthPaddingClass(depth);
  return (
    <li>
      <Link
        href={node.href ?? "#"}
        className={[
          "w-full rounded-lg px-3 py-2 text-sm",
          pad,
          active
            ? "bg-primary text-primary-content"
            : "hover:bg-base-200 text-base-content/80",
        ].join(" ")}
        aria-current={active ? "page" : undefined}
      >
        {node.label}
      </Link>
    </li>
  );
}

// 1) NavGroup의 props에 openKeys 추가, open boolean 대신 내부에서 계산
function NavGroup({
  node,
  pathTrail,
  pathname,
  openKeys,
  onToggle,
}: {
  node: NavNode;
  pathTrail: string[];
  pathname: string | null;
  openKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  const k = nodeKey(pathTrail, node);
  const active = anyChildActive(pathname, node);
  const isOpen = openKeys.has(k);

  return (
    <li className="rounded-lg">
      <button
        type="button"
        onClick={() => onToggle(k)}
        aria-expanded={isOpen}
        className={[
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm",
          active
            ? "bg-primary/10 text-base-content"
            : "hover:bg-base-200 text-base-content/80",
        ].join(" ")}
      >
        <span className="font-medium">{node.label}</span>
        <ChevronDown
          className={[
            "h-4 w-4 transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>

      {isOpen && node.children && (
        <ul className="menu mt-1 space-y-1">
          {node.children.map((child) => {
            const ck = nodeKey([...pathTrail, node.label], child);
            if (child.children && child.children.length > 0) {
              return (
                <NavGroup
                  key={ck}
                  node={child}
                  pathTrail={[...pathTrail, node.label]}
                  pathname={pathname}
                  openKeys={openKeys}
                  onToggle={onToggle}
                />
              );
            }
            return (
              <Leaf
                key={ck}
                node={child}
                active={isActivePath(pathname, child.href)}
                depth={1}
              />
            );
          })}
        </ul>
      )}
    </li>
  );
}

/* ---------------------- 메뉴 루트 ---------------------- */
function AdminSidebarMenu() {
  const pathname = usePathname();

  const defaultOpen = useMemo(() => {
    const open = new Set<string>();
    const dfs = (nodes: NavNode[], trail: string[]) => {
      for (const n of nodes) {
        const k = nodeKey(trail, n);
        if (n.children && n.children.length > 0) {
          if (anyChildActive(pathname, n)) open.add(k);
          dfs(n.children, [...trail, n.label]);
        }
      }
    };
    dfs(navTree, []);
    return open;
  }, [pathname]);

  const [openKeys, setOpenKeys] = useState<Set<string>>(defaultOpen);

  useEffect(() => {
    setOpenKeys(defaultOpen);
  }, [defaultOpen]);

  const anyActive = useMemo(() => {
    const walk = (nodes: NavNode[]): boolean => {
      for (const n of nodes) {
        if (isActivePath(pathname, n.href)) return true;
        if (n.children && walk(n.children)) return true;
      }
      return false;
    };
    return walk(navTree);
  }, [pathname]);

  // 2) 불필요한 opened 제거
  const onToggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <ul className="menu p-2">
      {navTree.map((node) => {
        const k = nodeKey([], node);
        if (node.children && node.children.length > 0) {
          return (
            <NavGroup
              key={k}
              node={node}
              pathTrail={[]}
              pathname={pathname}
              openKeys={openKeys}
              onToggle={onToggle}
            />
          );
        }
        return (
          <Leaf
            key={k}
            node={node}
            active={
              anyActive
                ? isActivePath(pathname, node.href)
                : node.href === "/admin"
            }
            depth={0}
          />
        );
      })}
    </ul>
  );
}

/* ---------------------- 사이드바 컨테이너 ---------------------- */
/**
 * daisyUI drawer 레이아웃 기반의 사이드바
 * - 외부 레이아웃에서 drawer 토글을 제어하려면 같은 id의 checkbox를 사용하세요.
 */
export default function AdminSidebar() {
  return (
    <aside
      className="card w-64 bg-base-100 p-2"
      data-theme="" // 페이지 전역 테마 상속 (테마 코드와 호환)
    >
      <div className="px-2 pb-2 pt-3 text-sm font-semibold">어드민</div>
      <div className="divide" />
      <AdminSidebarMenu />
      <div className="mt-2 text-center text-xs text-base-content/60">
        © Admin
      </div>
    </aside>
  );
}
