// src/app/api/(site)/auth/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  signupSchema,
  type ApiErrCode,
  type SignupInput,
  type SignupResponse,
} from "@/types/auth"; // 경로는 기존 사용처 유지
import { normalizeInput } from "./helpers";
import {
  resolveUserIdByUsernameOrReferral,
  ensureParentGroupSummaryForChildSignup,
} from "./referral";
import { signupWithTransaction } from "./service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 0) 입력 파싱
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json<SignupResponse>(
      { ok: false, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const parsed = signupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json<SignupResponse>(
      { ok: false, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const {
    username,
    email,
    password,
    name,
    referrer, // ✅ 필수 (스키마에서 min(1))
    sponsor,
    countryCode,
    groupNo,
  }: SignupInput = parsed.data;

  const uname = normalizeInput(username).toLowerCase();
  const em = normalizeInput(email).toLowerCase();
  const nm = normalizeInput(name);
  const ref = normalizeInput(referrer); // ✅ 공백 제거 후 빈 문자열이면 스키마 단계에서 걸러짐
  const spon = normalizeInput(sponsor ?? "");
  const ccRaw = normalizeInput(countryCode ?? "");

  // groupNo 선제 검증(양의 정수만 허용)
  if (groupNo != null && (!Number.isInteger(groupNo) || groupNo <= 0)) {
    return NextResponse.json<SignupResponse>(
      { ok: false, code: "INVALID_REQUESTED_GROUP_NO" },
      { status: 400 }
    );
  }

  // 1) 중복 검사
  const [duUser, duEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username: uname } }),
    prisma.user.findUnique({ where: { email: em } }),
  ]);
  if (duUser) {
    return NextResponse.json<SignupResponse>(
      { ok: false, code: "USERNAME_TAKEN" },
      { status: 409 }
    );
  }
  if (duEmail) {
    return NextResponse.json<SignupResponse>(
      { ok: false, code: "EMAIL_TAKEN" },
      { status: 409 }
    );
  }

  // 2) 국가 코드 확인(선택)
  let normalizedCountryCode: string | null = null;
  if (ccRaw) {
    if (!/^[A-Za-z]{2}$/.test(ccRaw)) {
      return NextResponse.json<SignupResponse>(
        { ok: false, code: "COUNTRY_CODE_INVALID" },
        { status: 400 }
      );
    }
    normalizedCountryCode = ccRaw.toUpperCase();
    const country = await prisma.country.findUnique({
      where: { code: normalizedCountryCode },
      select: { code: true },
    });
    if (!country) {
      return NextResponse.json<SignupResponse>(
        { ok: false, code: "COUNTRY_NOT_FOUND" },
        { status: 400 }
      );
    }
  }

  // 3) 추천인/후원인 처리 (✅ referrer는 필수)
  const referrerId = await resolveUserIdByUsernameOrReferral(ref);
  if (!referrerId) {
    return NextResponse.json<SignupResponse>(
      { ok: false, code: "REFERRER_NOT_FOUND" },
      { status: 400 }
    );
  }

  let sponsorId: string | null = null;
  if (spon) {
    sponsorId = await resolveUserIdByUsernameOrReferral(spon);
    if (!sponsorId) {
      return NextResponse.json<SignupResponse>(
        { ok: false, code: "SPONSOR_NOT_FOUND" },
        { status: 400 }
      );
    }
  }
  if (sponsorId && sponsorId === referrerId) {
    return NextResponse.json<SignupResponse>(
      { ok: false, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // 4) 트랜잭션 실행 (✅ createEdge 제거, referrerId 필수 전달)
  const result = await signupWithTransaction({
    username: uname,
    email: em,
    password,
    name: nm,
    countryCode: normalizedCountryCode,
    referrerId, // ✅ required
    sponsorId,
    requestedGroupNo: groupNo ?? null,
  });

  if (!result.ok) {
    const raw = result.code as string;
    const code: ApiErrCode =
      raw === "GROUP_NO_TAKEN" ? "VALIDATION_ERROR" : (raw as ApiErrCode);

    const status =
      code === "INVALID_REQUESTED_GROUP_NO"
        ? 400
        : code === "VALIDATION_ERROR"
        ? 409
        : 500;

    return NextResponse.json<SignupResponse>({ ok: false, code }, { status });
  }

  // 5) 가입 직후 부모 GroupSummary 보장 (best-effort)
  try {
    await ensureParentGroupSummaryForChildSignup(result.user.id);
  } catch (e) {
    console.warn("[signup] ensureParentGroupSummaryForChildSignup failed:", e);
  }

  const res = NextResponse.json<SignupResponse>(
    { ok: true, user: result.user },
    { status: 201 }
  );
  res.headers.set("Location", `/api/users/${result.user.id}`);
  return res;
}
