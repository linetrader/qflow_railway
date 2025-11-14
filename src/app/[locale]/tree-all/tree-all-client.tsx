// src/app/tree-all/tree-all-client.tsx
"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RawNodeDatum, CustomNodeElementProps } from "react-d3-tree";

/** ---------------- API 타입 ---------------- */
type NodeApi = {
  id: string;
  username: string;
  email: string;
  name: string;
  level: number;
  countryCode: string | null;
  createdAt: string; // ISO
  childrenCount: number;
};
type EdgeApi = { parentId: string; childId: string };
type RespOk = {
  ok: true;
  root: NodeApi;
  nodes: NodeApi[];
  edges: EdgeApi[];
  meta: {
    maxDepth: number;
    limitPerLevel: number;
    totalNodes: number;
    totalEdges: number;
  };
};
type RespErr = { ok: false; error: string };

/** -------------- nodes/edges → 계층 트리 -------------- */
type TreeNode = NodeApi & { children: TreeNode[] };

function buildTree(
  root: NodeApi,
  nodes: NodeApi[],
  edges: EdgeApi[]
): TreeNode {
  const byId = new Map<string, TreeNode>();
  for (const n of nodes) byId.set(n.id, { ...n, children: [] });
  for (const e of edges) {
    const p = byId.get(e.parentId);
    const c = byId.get(e.childId);
    if (p && c) p.children.push(c);
  }
  const r = byId.get(root.id);
  return r ?? { ...root, children: [] };
}

function toRawNodeDatum(n: TreeNode): RawNodeDatum {
  return {
    name: n.username,
    attributes: {
      name: n.name,
      email: n.email,
      level: n.level,
      country: n.countryCode ?? "-",
      childrenShown: n.children.length,
      childrenTotal: n.childrenCount,
      createdAt: new Date(n.createdAt).toLocaleString(),
      hasMore: n.childrenCount > n.children.length,
    },
    // 커스텀 메타(네비게이션용)
    // @ts-expect-error custom meta
    __meta__: { id: n.id, username: n.username },
    children: n.children.map(toRawNodeDatum),
  };
}

/** -------------- react-d3-tree 동적 import (SSR off) -------------- */
const Tree = dynamic(() => import("react-d3-tree").then((m) => m.Tree), {
  ssr: false,
});

/** -------------- 컨테이너 사이즈 훅 -------------- */
function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ width: cr.width, height: cr.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, size };
}

/** ===================== 페이지 ===================== */
export default function TreeAllPage() {
  const sp = useSearchParams();

  // 쿼리 → 기본값
  const rootQ = (sp.get("root") || "admin").trim();
  const maxDepth = Math.max(
    1,
    Math.min(1000, Number(sp.get("maxDepth") ?? 32))
  );
  const limitPerLevel = Math.max(
    100,
    Math.min(1000, Number(sp.get("limitPerLevel") ?? 300))
  );
  const orientation =
    (sp.get("orientation") as "vertical" | "horizontal") || "vertical";
  const initialDepthFromQuery = Math.max(
    0,
    Math.min(1000, Number(sp.get("initialDepth") ?? 0))
  );

  const [resp, setResp] = useState<RespOk | RespErr | null>(null);
  const [loading, setLoading] = useState(false);

  // 초기 접기/펼치기 제어: Tree 재마운트를 위해 key 사용
  const [initialDepthInternal, setInitialDepthInternal] = useState<number>(
    initialDepthFromQuery
  );
  const [treeKey, setTreeKey] = useState<number>(0);

  const { ref: fullRef, size: fullSize } = useContainerSize<HTMLDivElement>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setResp(null);
    try {
      const qs = new URLSearchParams({
        root: rootQ,
        maxDepth: String(maxDepth),
        limitPerLevel: String(limitPerLevel),
      });
      const res = await fetch(`/api/admin/users/tree?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as RespOk | RespErr;
      setResp(data);
    } catch (e: unknown) {
      setResp({
        ok: false,
        error: e instanceof Error ? e.message : "NETWORK_ERROR",
      });
    } finally {
      setLoading(false);
    }
  }, [rootQ, maxDepth, limitPerLevel]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const ok = resp && resp.ok ? (resp as RespOk) : null;
  const err = resp && !resp.ok ? (resp as RespErr) : null;

  const treeData: RawNodeDatum[] | null = useMemo(() => {
    if (!ok) return null;
    return [toRawNodeDatum(buildTree(ok.root, ok.nodes, ok.edges))];
  }, [ok]);

  /** ------------ 커스텀 노드: foreignObject로 선명한 텍스트 ------------ */
  const renderCustomNode = useCallback(
    ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
      const uname = String(nodeDatum.name ?? "");
      const name = String(nodeDatum.attributes?.name ?? "");
      const level = String(nodeDatum.attributes?.level ?? "-");
      const country = String(nodeDatum.attributes?.country ?? "-");
      const childrenShown = Number(nodeDatum.attributes?.childrenShown ?? 0);
      const childrenTotal = Number(nodeDatum.attributes?.childrenTotal ?? 0);
      const hasMore = Boolean(nodeDatum.attributes?.hasMore ?? false);

      const W = 260;
      const H = 100;

      // @ts-expect-error custom meta
      const id: string | undefined = nodeDatum.__meta__?.id;

      return (
        <g>
          <foreignObject x={-W / 2} y={-H / 2} width={W} height={H}>
            <div
              style={{
                width: W,
                height: H,
                position: "relative",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#0b1220",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                color: "#e2e8f0",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", "Helvetica Neue", Arial, "Noto Color Emoji", "Segoe UI Emoji", sans-serif',
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
                textRendering: "optimizeLegibility",
                lineHeight: 1.2,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>
                {uname}
              </div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>
                {name} · Lv{level} · {country}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                자식 {childrenShown}
                {hasMore ? ` / ${childrenTotal} (생략)` : ""}
              </div>

              {/* 접기/펼치기 */}
              <button
                onClick={toggleNode}
                title="펼치기/접기"
                style={{
                  position: "absolute",
                  left: 6,
                  top: 6,
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#111827",
                  color: "#e5e7eb",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ±
              </button>

              {/* 상세 보기 */}
              <button
                onClick={() =>
                  id && window.open(`/admin/users/${id}`, "_blank")
                }
                title="상세 새 탭"
                style={{
                  position: "absolute",
                  right: 6,
                  top: 6,
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#1e293b",
                  color: "#93c5fd",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ↗
              </button>
            </div>
          </foreignObject>
        </g>
      );
    },
    []
  );

  /** ------------ 트리 렌더 ------------ */
  const renderTree = (w: number, h: number) => {
    if (!ok || !treeData || w <= 0 || h <= 0) return null;
    return (
      <Tree
        key={treeKey} // 재마운트 키
        data={treeData}
        orientation={orientation}
        collapsible
        shouldCollapseNeighborNodes={false}
        initialDepth={initialDepthInternal}
        translate={{ x: w / 2, y: Math.max(120, Math.floor(h * 0.15)) }}
        zoomable
        enableLegacyTransitions={false}
        separation={{ siblings: 1, nonSiblings: 1.5 }}
        nodeSize={{ x: 280, y: 150 }}
        renderCustomNodeElement={renderCustomNode}
        pathFunc="elbow"
        allowForeignObjects
        styles={{
          links: { stroke: "rgba(255,255,255,0.6)", strokeWidth: 1.6 },
        }}
      />
    );
  };

  /** ------------ 툴바 동작 ------------ */
  const handleExpandAll = () => {
    setInitialDepthInternal(1000); // 사실상 전체 펼침
    setTreeKey((k) => k + 1); // 재마운트
  };
  const handleResetDepth = () => {
    setInitialDepthInternal(initialDepthFromQuery);
    setTreeKey((k) => k + 1);
  };
  const handleRefresh = () => {
    void fetchData();
  };
  const handleClose = () => {
    window.close();
  };

  return (
    <div className="fixed inset-0 bg-transparent">
      {/* 상단 고정 헤더(툴바) */}
      <header className="fixed top-0 inset-x-0 z-[10000] h-12 bg-[#0b1220] border-b border-white/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">
            유저 트리 전체보기
          </span>
          <span className="text-xs text-white/70">
            루트: <span className="text-white">{rootQ}</span>
            {ok && (
              <span className="ml-2 text-white/60">
                (nodes: {ok.meta.totalNodes}, depth≤{maxDepth})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="rounded-md border border-white/30 text-white/90 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            전부 펼치기
          </button>
          <button
            onClick={handleResetDepth}
            className="rounded-md border border-white/30 text-white/80 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            기본 접기
          </button>
          <button
            onClick={handleRefresh}
            className="rounded-md border border-white/20 text-white/70 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            새로고침
          </button>
          <button
            onClick={handleClose}
            className="rounded-md border border-white/20 text-white/70 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            닫기
          </button>
        </div>
      </header>

      {/* 트리 캔버스 (헤더 높이 48px = top-12) */}
      <div className="absolute inset-x-0 bottom-0 top-12">
        <div ref={fullRef} className="w-full h-full">
          {err && (
            <div className="p-4 text-sm text-red-400">오류: {err.error}</div>
          )}
          {renderTree(fullSize.width, fullSize.height)}
          {!ok && !err && (
            <div className="h-full w-full grid place-items-center text-sm text-white/70">
              {loading ? "불러오는 중…" : "데이터 없음"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
