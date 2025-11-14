// src/app/api/(site)/menu/announcement/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BoardType, PostVisibility } from "@/generated/prisma";
import { z } from "zod";

// 공용 응답 헬퍼
function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data } as const, { status: 200 });
}
function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message } as const, { status });
}

// 쿼리 검증
const IdQuerySchema = z.object({ id: z.string().min(1) });

// GET: 목록/상세 (공개 + 발행된 공지만)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // 상세
    if (id) {
      const parsed = IdQuerySchema.safeParse({ id });
      if (!parsed.success) return err("INVALID_ID", 400);

      const post = await prisma.post.findFirst({
        where: {
          id: parsed.data.id,
          boardType: BoardType.NOTICE,
          visibility: PostVisibility.PUBLIC,
          isPublished: true,
        },
        select: {
          id: true,
          title: true,
          bodyHtml: true,
          publishedAt: true,
          createdAt: true,
        },
      });
      if (!post) return err("NOT_FOUND", 404);

      return ok({
        id: post.id,
        title: post.title,
        bodyHtml: post.bodyHtml,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        createdAt: post.createdAt.toISOString(),
      });
    }

    // 목록(발행일 최신순)
    const rows = await prisma.post.findMany({
      where: {
        boardType: BoardType.NOTICE,
        visibility: PostVisibility.PUBLIC,
        isPublished: true,
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, publishedAt: true },
    });

    return ok(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        publishedAt:
          (r.publishedAt ?? r.publishedAt)?.toISOString() ??
          new Date(0).toISOString(),
      }))
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return err(msg, 500);
  }
}
