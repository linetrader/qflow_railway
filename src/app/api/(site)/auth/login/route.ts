// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { loginSchema, type LoginInput, type LoginResponse } from "@/types/auth"; // ✅ 경로 통일

/** Cookie/JWT 설정 */
const COOKIE_NAME = process.env.JWT_COOKIE_NAME || "qflow_token";
const JWT_EXPIRES =
  process.env.JWT_EXPIRES || process.env.JWT_EXPIRES_IN || "24h";
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is missing or too short (>=16 recommended).");
  }
  return new TextEncoder().encode(secret);
}

function parseMaxAge(
  v: string | number | undefined,
  fallbackSec = 60 * 60 * 24
): number {
  if (typeof v === "number" && Number.isFinite(v))
    return Math.max(0, Math.floor(v));
  if (typeof v !== "string") return fallbackSec;
  const m = v.match(/^(\d+)([smhd])?$/i);
  if (!m) return fallbackSec;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || "s").toLowerCase();
  const factor =
    unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return n * factor;
}

export async function POST(req: Request) {
  // 1) 안전 파싱 + 스키마 검증
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<LoginResponse>(
      { ok: false, code: "VALIDATION_ERROR", message: "Invalid JSON." },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<LoginResponse>(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Invalid username or password format.",
      },
      { status: 400 }
    );
  }
  const { username, password }: LoginInput = parsed.data;

  // 2) 유저 조회(소문자 normalize) — ✅ referrerId/sponsorId로 가져오기
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      passwordHash: true,
      referrerId: true, // ✅
      sponsorId: true, // ✅
      createdAt: true,
      level: true,
    },
  });

  // 3) 비밀번호 검증
  const ok = !!user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) {
    return NextResponse.json<LoginResponse>(
      {
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid username or password.",
      }, // ✅ 타입 허용됨
      { status: 401 }
    );
  }

  // 4) JWT 발급
  const secret = getJwtSecret();
  let jwt = new SignJWT({
    userId: user.id,
    email: user.email,
    sub: user.id,
    level: user.level ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES);

  if (JWT_ISSUER) jwt = jwt.setIssuer(JWT_ISSUER);
  if (JWT_AUDIENCE) jwt = jwt.setAudience(JWT_AUDIENCE);

  const token = await jwt.sign(secret);

  // 5) httpOnly cookie 저장
  const cookieStore = await cookies();
  const maxAge = parseMaxAge(JWT_EXPIRES, 60 * 60 * 24);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  // 6) 안전 필드 반환 — ✅ id 문자열 사용
  const safeUser = {
    id: user.id,
    username: user.username,
    email: user.email, // string | null
    name: user.name, // string | null
    referrer: user.referrerId ?? null, // ✅ string | null
    sponsor: user.sponsorId ?? null, // ✅ string | null
    createdAt: user.createdAt,
  };

  return NextResponse.json<LoginResponse>(
    { ok: true, user: safeUser },
    { status: 200 }
  );
}
