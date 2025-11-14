// src/app/api/admin/packages/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@/generated/prisma/runtime/library";

export const runtime = "nodejs";

// GET /api/admin/packages/:id
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> } // ← params는 Promise
) {
  try {
    const { id } = await context.params; // ← 반드시 await
    const safeId = id?.trim();
    if (!safeId)
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

    const pkg = await prisma.package.findUnique({
      where: { id: safeId },
      select: { id: true, name: true, price: true, dailyDftAmount: true },
    });

    if (!pkg) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ item: pkg });
  } catch (e) {
    console.error("[GET /api/admin/packages/[id]] error:", e);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/packages/:id
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> } // ← Promise
) {
  try {
    const { id } = await context.params;
    const safeId = id?.trim();
    if (!safeId)
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

    const body = (await req.json()) as {
      name?: string;
      price?: string;
      dailyDftAmount?: string;
    };

    const updated = await prisma.package.update({
      where: { id: safeId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.price ? { price: new Decimal(body.price) } : {}),
        ...(body.dailyDftAmount
          ? { dailyDftAmount: new Decimal(body.dailyDftAmount) }
          : {}),
      },
      select: { id: true, name: true, price: true, dailyDftAmount: true },
    });

    return NextResponse.json({ item: updated });
  } catch (e) {
    console.error("[PUT /api/admin/packages/[id]] error:", e);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/packages/:id
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> } // ← Promise
) {
  try {
    const { id } = await context.params;
    const safeId = id?.trim();
    if (!safeId)
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

    await prisma.package.delete({ where: { id: safeId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/packages/[id]] error:", e);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
