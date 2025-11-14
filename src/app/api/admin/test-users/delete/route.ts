// app/api/admin/test-users/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export const runtime = "nodejs";

type RespOk = { ok: true; deleted: number };
type RespErr = {
  ok: false;
  error: string;
  code?: string;
  meta?: Record<string, string>;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error } satisfies RespErr, { status });
}

function isIdsBody(x: unknown): x is { ids: string[] } {
  return (
    typeof x === "object" &&
    x !== null &&
    Array.isArray((x as { ids?: unknown }).ids) &&
    (x as { ids: unknown[] }).ids.every((v) => typeof v === "string")
  );
}

function isPrefixRangeBody(
  x: unknown
): x is { prefix: string; start: number; end: number } {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.prefix === "string" &&
    typeof o.start === "number" &&
    typeof o.end === "number"
  );
}

/** 의존 레코드 → 사용자 순으로 안전 삭제 */
async function deleteUsersDeep(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const deletedCount = await prisma.$transaction(async (tx) => {
    // 0) 삭제 대상이 실제로 존재하는지 제한 (중복 제거)
    const targets = await tx.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const userIds = targets.map((u) => u.id);
    if (userIds.length === 0) return 0;

    // 1) 이력/커미션 등 FK 의존 레코드 삭제 (자식 → 부모)
    // CenterCommission 가 UserPackageHistory(sourceHistoryId) 를 참조하므로 먼저 CenterCommission 부터!
    await tx.centerCommission.deleteMany({
      where: {
        OR: [
          { centerUserId: { in: userIds } },
          { buyerUserId: { in: userIds } },
          { sourceHistory: { userId: { in: userIds } } },
        ],
      },
    });

    await tx.referralCommission.deleteMany({
      where: {
        OR: [
          { buyerUserId: { in: userIds } },
          { beneficiaryUserId: { in: userIds } },
        ],
      },
    });

    await tx.walletTx.deleteMany({ where: { userId: { in: userIds } } });

    await tx.userPackageHistory.deleteMany({
      where: { userId: { in: userIds } },
    });

    await tx.userPackage.deleteMany({ where: { userId: { in: userIds } } });

    await tx.referralGroupSummary.deleteMany({
      where: { userId: { in: userIds } },
    });

    // ReferralEdge: 부모/자식 양쪽 필드 모두 정리
    await tx.referralEdge.deleteMany({
      where: {
        OR: [{ parentId: { in: userIds } }, { childId: { in: userIds } }],
      },
    });

    // Center/Link/Manager 관련
    await tx.userCenterLink.deleteMany({
      where: {
        OR: [{ userId: { in: userIds } }, { centerUserId: { in: userIds } }],
      },
    });

    await tx.centerManager.deleteMany({ where: { userId: { in: userIds } } });

    // Wallet 은 User 1:1
    await tx.userWallet.deleteMany({ where: { userId: { in: userIds } } });

    // 2) 마지막에 사용자 삭제
    const res = await tx.user.deleteMany({ where: { id: { in: userIds } } });
    return res.count;
  });

  return deletedCount;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;

    // 1) ids 방식
    if (isIdsBody(body)) {
      const ids = Array.from(new Set(body.ids)).slice(0, 1000);
      if (ids.length === 0) return bad("Empty ids");

      const deleted = await deleteUsersDeep(ids);
      return NextResponse.json({ ok: true, deleted } satisfies RespOk);
    }

    // 2) prefix + start/end 방식
    if (isPrefixRangeBody(body)) {
      const { prefix, start, end } = body;
      if (!prefix) return bad("prefix required");
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start <= 0 ||
        end < start
      ) {
        return bad("Invalid range: start/end");
      }

      // 후보 조회 (정렬 추가로 결정성 확보)
      const candidates = await prisma.user.findMany({
        where: { username: { startsWith: prefix } },
        select: { id: true, username: true },
        orderBy: { username: "asc" },
        take: 10000, // 상한 상향 (필요시 조정)
      });

      const idsToDelete: string[] = [];
      for (const c of candidates) {
        const tail = c.username.slice(prefix.length);
        const num = Number(tail);
        if (Number.isInteger(num) && num >= start && num <= end) {
          idsToDelete.push(c.id);
        }
      }

      if (idsToDelete.length === 0) {
        return NextResponse.json({ ok: true, deleted: 0 } satisfies RespOk);
      }

      const deleted = await deleteUsersDeep(idsToDelete);
      return NextResponse.json({ ok: true, deleted } satisfies RespOk);
    }

    return bad(
      "Invalid body: either { ids: string[] } or { prefix, start, end } required"
    );
  } catch (e: unknown) {
    // Prisma FK 오류 등 명확히 식별해 409로 내려주기
    if (
      e &&
      typeof e === "object" &&
      "code" in (e as Record<string, unknown>)
    ) {
      const pe = e as Prisma.PrismaClientKnownRequestError;
      if (pe.code === "P2003") {
        return NextResponse.json(
          {
            ok: false,
            error: "FOREIGN_KEY_CONSTRAINT_FAILED",
            code: pe.code,
            meta: pe.meta as Record<string, string> | undefined,
          } satisfies RespErr,
          { status: 409 }
        );
      }
    }
    const message = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: message } satisfies RespErr, {
      status: 500,
    });
  }
}
