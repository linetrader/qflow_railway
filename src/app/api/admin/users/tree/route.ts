// app/api/admin/users/tree/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Node = {
  id: string;
  username: string;
  email: string;
  name: string;
  level: number;
  countryCode: string | null;
  createdAt: string;
  childrenCount: number; // 즉시 자식 수
};

type Edge = {
  parentId: string;
  childId: string;
};

type RespOk = {
  ok: true;
  root: Node;
  nodes: Node[]; // root 포함 전체(중복 없이)
  edges: Edge[]; // parent-child 관계
  meta: {
    maxDepth: number;
    limitPerLevel: number;
    totalNodes: number;
    totalEdges: number;
  };
};

type RespErr = { ok: false; error: string };

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error } as RespErr, { status });
}

// root 식별: username/referralCode 우선, 없으면 id로 시도
async function resolveRoot(q: string) {
  // 1) username/referralCode
  const byNamed = await prisma.user.findFirst({
    where: { OR: [{ username: q }, { referralCode: q }] },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      level: true,
      countryCode: true,
      createdAt: true,
    },
  });
  if (byNamed) return byNamed;

  // 2) id
  const byId = await prisma.user.findUnique({
    where: { id: q },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      level: true,
      countryCode: true,
      createdAt: true,
    },
  });
  return byId;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rootQ = (url.searchParams.get("root") ?? "").trim();

    // ▼ maxDepth 상한 1000, 기본값 32로 상향
    const maxDepthRaw = Number(url.searchParams.get("maxDepth") ?? "32");
    const limitRaw = Number(url.searchParams.get("limitPerLevel") ?? "200");

    if (!rootQ)
      return bad("root query is required (username | referralCode | id)");

    const maxDepth = Number.isInteger(maxDepthRaw)
      ? Math.max(1, Math.min(1000, maxDepthRaw)) // ← 8 → 1000
      : 32; // ← 3/4 → 32

    const limitPerLevel = Number.isInteger(limitRaw)
      ? Math.max(10, Math.min(1000, limitRaw))
      : 200;

    const rootUser = await resolveRoot(rootQ);
    if (!rootUser) return bad(`Root user not found: ${rootQ}`, 404);

    // BFS
    const nodesMap = new Map<string, Node>();
    const edges: Edge[] = [];

    // childrenCount 계산을 위한 캐시: id -> count
    async function countChildren(
      userIds: string[]
    ): Promise<Map<string, number>> {
      if (userIds.length === 0) return new Map();
      const agg = await prisma.referralEdge.groupBy({
        by: ["parentId"],
        where: { parentId: { in: userIds } },
        _count: { childId: true },
      });
      const m = new Map<string, number>();
      for (const a of agg) m.set(a.parentId, a._count.childId);
      return m;
    }

    // 레벨 0: root
    nodesMap.set(rootUser.id, {
      id: rootUser.id,
      username: rootUser.username,
      email: rootUser.email,
      name: rootUser.name,
      level: rootUser.level,
      countryCode: rootUser.countryCode,
      createdAt: rootUser.createdAt.toISOString(),
      childrenCount: 0, // 후에 채움
    });

    let frontier = [rootUser.id];

    for (let depth = 1; depth <= maxDepth; depth++) {
      if (frontier.length === 0) break;

      // 현재 레벨의 parentId 집합에서 children 가져오기
      const edgesRows = await prisma.referralEdge.findMany({
        where: { parentId: { in: frontier } },
        select: { parentId: true, childId: true },
        take: limitPerLevel * frontier.length,
        orderBy: { childId: "asc" },
      });

      if (edgesRows.length === 0) break;

      const childIds = Array.from(new Set(edgesRows.map((e) => e.childId)));

      // 자식 유저 상세
      const children = await prisma.user.findMany({
        where: { id: { in: childIds } },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          level: true,
          countryCode: true,
          createdAt: true,
        },
        orderBy: { username: "asc" },
      });

      const childrenCountMap = await countChildren(childIds);

      // 노드/엣지 누적
      for (const e of edgesRows) {
        edges.push({ parentId: e.parentId, childId: e.childId });
      }

      for (const c of children) {
        if (!nodesMap.has(c.id)) {
          nodesMap.set(c.id, {
            id: c.id,
            username: c.username,
            email: c.email,
            name: c.name,
            level: c.level,
            countryCode: c.countryCode,
            createdAt: c.createdAt.toISOString(),
            childrenCount: childrenCountMap.get(c.id) ?? 0,
          });
        }
      }

      frontier = childIds;
    }

    // 마지막으로 root의 childrenCount 세팅
    const rootChildrenCount = await prisma.referralEdge.count({
      where: { parentId: rootUser.id },
    });
    const rootNode = nodesMap.get(rootUser.id)!;
    rootNode.childrenCount = rootChildrenCount;

    return NextResponse.json({
      ok: true,
      root: rootNode,
      nodes: Array.from(nodesMap.values()),
      edges,
      meta: {
        maxDepth,
        limitPerLevel,
        totalNodes: nodesMap.size,
        totalEdges: edges.length,
      },
    } as RespOk);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg } as RespErr, {
      status: 500,
    });
  }
}
