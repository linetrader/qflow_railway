// src/app/api/admin/users/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "UNKNOWN_ERROR";
}

/**
 * NOTE: Next's type checker is complaining about the second argument type.
 * To avoid the mismatch, we don't declare the 2nd arg at all and parse `id` from the URL.
 */
export async function GET(req: Request) {
  try {
    // Extract `[id]` from the request URL path
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // .../api/admin/users/[id]
    const id = segments[segments.length - 1]?.trim();

    if (!id) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        referralCode: true,
        level: true,
        countryCode: true,
        googleOtpEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ item: user });
  } catch (e: unknown) {
    console.error("[GET /api/admin/users/[id]] error:", e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
