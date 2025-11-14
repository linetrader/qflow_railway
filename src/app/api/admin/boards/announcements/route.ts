// src/app/api/admin/boards/announcements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BoardType, BodyFormat, PostVisibility } from "@/generated/prisma";
import {
  AdminPostFormSchema,
  AdminPostUpdateSchema,
  IdQuerySchema,
  sanitizeHtmlAllowBasic,
} from "@/app/[locale]/admin/boards/announcements/gaurd/announcements";

// ✅ 세션 유저 ID를 가져오는 함수 (프로젝트에 이미 쓰시던 동일 경로 가정)
import { getUserId } from "@/lib/request-user";
import { z } from "zod";

function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data } as const, { status: 200 });
}
function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message } as const, { status });
}

// ==== GET: 목록 / 단건 상세 ====
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // 상세
    if (id) {
      const parsed = IdQuerySchema.safeParse({ id });
      if (!parsed.success) return err("INVALID_ID", 400);

      const post = await prisma.post.findFirst({
        where: { id: parsed.data.id, boardType: BoardType.NOTICE },
        select: {
          id: true,
          title: true,
          bodyRaw: true,
          bodyHtml: true,
          visibility: true,
          isPublished: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!post) return err("NOT_FOUND", 404);

      return ok({
        id: post.id,
        title: post.title,
        bodyRaw: post.bodyRaw,
        bodyHtml: post.bodyHtml,
        visibility:
          post.visibility === PostVisibility.PRIVATE ? "PRIVATE" : "PUBLIC",
        isPublished: post.isPublished,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      });
    }

    // 목록(제목 오름차순)
    const rows = await prisma.post.findMany({
      where: { boardType: BoardType.NOTICE },
      orderBy: [{ title: "asc" }],
      select: { id: true, title: true, isPublished: true, createdAt: true },
    });

    return ok(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        isPublished: r.isPublished,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return err(msg, 500);
  }
}

// ==== POST: 생성 ====
export async function POST(req: NextRequest) {
  try {
    // ✅ 세션 사용자 확인
    const userId = await getUserId();
    if (!userId) return err("UNAUTHORIZED", 401);

    const json = await req.json().catch(() => null);
    if (!json) return err("EMPTY_BODY", 400);

    const parsed = AdminPostFormSchema.safeParse(json);
    if (!parsed.success) return err("INVALID_BODY", 400);

    const { title, bodyRaw, bodyHtml, visibility, isPublished } = parsed.data;
    const safeHtml = sanitizeHtmlAllowBasic(bodyHtml);

    const now = new Date();
    const created = await prisma.post.create({
      data: {
        boardType: BoardType.NOTICE,
        supportCategory: null,
        authorId: userId, // ✅ FK: 실제 존재하는 사용자 ID 필요
        visibility:
          visibility === "PRIVATE"
            ? PostVisibility.PRIVATE
            : PostVisibility.PUBLIC,
        title,
        bodyFormat: BodyFormat.HTML,
        bodyRaw: bodyRaw ?? "",
        bodyHtml: safeHtml,
        isPublished,
        publishedAt: isPublished ? now : null,
        tags: [],
      },
      select: { id: true },
    });

    return ok({ id: created.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return err(msg, 500);
  }
}

// ==== PATCH: 수정 ====
export async function PATCH(req: NextRequest) {
  try {
    // (선택) 권한 정책이 있으면 작성자/관리자 검증 추가
    const json = await req.json().catch(() => null);
    if (!json) return err("EMPTY_BODY", 400);

    const parsed = AdminPostUpdateSchema.safeParse(json);
    if (!parsed.success) return err("INVALID_BODY", 400);

    const { id, title, bodyRaw, bodyHtml, visibility, isPublished } =
      parsed.data;

    const exists = await prisma.post.findFirst({
      where: { id, boardType: BoardType.NOTICE },
      select: { id: true, publishedAt: true },
    });
    if (!exists) return err("NOT_FOUND", 404);

    const safeHtml = sanitizeHtmlAllowBasic(bodyHtml);
    const nextPublishedAt = isPublished
      ? exists.publishedAt ?? new Date()
      : null;

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title,
        bodyRaw: bodyRaw ?? "",
        bodyHtml: safeHtml,
        visibility:
          visibility === "PRIVATE"
            ? PostVisibility.PRIVATE
            : PostVisibility.PUBLIC,
        isPublished,
        publishedAt: nextPublishedAt,
      },
      select: { id: true },
    });

    return ok({ id: updated.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return err(msg, 500);
  }
}

// ==== DELETE: 일괄 삭제 ====
const BulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function DELETE(req: NextRequest) {
  try {
    // (선택) 관리자/권한 검증이 필요하면 여기서 수행
    // const userId = await getUserId();
    // if (!userId) return err("UNAUTHORIZED", 401);

    const json = await req.json().catch(() => null);
    const parsed = BulkDeleteSchema.safeParse(json);
    if (!parsed.success) return err("INVALID_BODY", 400);

    const { ids } = parsed.data;

    const result = await prisma.post.deleteMany({
      where: {
        id: { in: ids },
        boardType: BoardType.NOTICE, // 공지 게시판만
      },
    });

    // 관계(onDelete: Cascade) 설정에 따라 Attachment/Comment/SupportAssignment는 자동 정리
    return ok({ deletedCount: result.count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return err(msg, 500);
  }
}
