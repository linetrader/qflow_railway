// app/api/admin/test-users/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  computeDepthForChild,
  decideGroupNoOrThrow,
  ensureParentGroupSummary,
} from "@/app/api/(site)/auth/signup/referral";

export const runtime = "nodejs";

type PostBody = {
  start: number; // 0 허용 (count 모드)
  end: number; // 0 허용 (count 모드)
  count?: number; // count 모드에서 사용
  prefix: string;
  pad: number;
  root: string;
  password?: string;
  country?: string;
  dry?: boolean;
  bcryptCost?: number;
  delayMs?: number;

  // ▶ 추가: 특정 레벨 부모 모드
  parentLevel?: number; // 부모로 사용할 사용자 레벨 (>=1)
  attachPerParent?: number; // 부모당 생성 인원 (>=1)
  parentFilterPrefix?: string; // 부모 username startsWith 필터 (선택)
  parentLimit?: number; // 부모 후보 상한 (기본 200~1000 등)
};

type ItemResult =
  | {
      n: number;
      username: string;
      status: "CREATED";
      id: string;
      referrer: string;
    }
  | { n: number; username: string; status: "SKIPPED_EXISTS" }
  | { n: number; username: string; status: "DRY"; referrer: string }
  | { n: number; username: string; status: "ERROR"; message: string };

type Resp =
  | {
      ok: true;
      summary: {
        requested: number;
        created: number;
        skipped: number;
        dry: number;
        errors: number;
        lastParent: string;
        mode: "range" | "count" | "attachByLevel";
        parentsUsed?: number;
      };
      items: ItemResult[];
    }
  | { ok: false; error: string };

function padNum(n: number, w: number) {
  const s = String(n);
  return s.length >= w ? s : "0".repeat(w - s.length) + s;
}
function generateReferralCode(): string {
  const a = crypto.randomBytes(6).toString("hex");
  const b = Date.now().toString(36);
  return (a + b).toUpperCase();
}
type FindUniqueArgs = {
  where: { referralCode: string };
  select: { id: boolean };
};
type FindUniqueFn = (args: FindUniqueArgs) => Promise<{ id: string } | null>;
async function ensureUniqueReferralCode(
  client: { user: { findUnique: FindUniqueFn } },
  maxAttempts = 5
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateReferralCode();
    const exists = await client.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error(
    "Failed to generate unique referralCode after multiple attempts"
  );
}
async function resolveUser(q: string) {
  return prisma.user.findFirst({
    where: { OR: [{ username: q }, { referralCode: q }] },
    select: { id: true, username: true },
  });
}
async function countryIfExists(code?: string) {
  if (!code) return undefined;
  const c = await prisma.country.findUnique({ where: { code } });
  return c ? code : undefined;
}
async function createUserInChain(params: {
  username: string;
  email: string;
  password: string;
  name?: string;
  referrerUsernameOrCode: string;
  countryCode?: string;
  bcryptCost: number;
}) {
  const {
    username,
    email,
    password,
    name,
    referrerUsernameOrCode,
    countryCode,
    bcryptCost,
  } = params;
  return prisma.$transaction(async (tx) => {
    const parent = await tx.user.findFirst({
      where: {
        OR: [
          { username: referrerUsernameOrCode },
          { referralCode: referrerUsernameOrCode },
        ],
      },
      select: { id: true, username: true },
    });
    if (!parent)
      throw new Error(`Referrer not found: ${referrerUsernameOrCode}`);

    const referralCode = await ensureUniqueReferralCode(tx);
    const passwordHash = await bcrypt.hash(password, bcryptCost);

    const user = await tx.user.create({
      data: {
        username,
        email,
        name: name ?? username,
        passwordHash,
        referralCode,
        referrerId: parent.id,
        countryCode: countryCode ?? null,
      },
      select: { id: true },
    });

    await tx.userWallet.create({ data: { userId: user.id } });
    await tx.userRewardSummary.create({ data: { userId: user.id } });
    await tx.userReferralStats.create({ data: { userId: user.id } });

    const depth = await computeDepthForChild(tx, parent.id);
    const groupNo = await decideGroupNoOrThrow({
      tx,
      parentId: parent.id,
      requested: null,
    });
    await tx.referralEdge.create({
      data: { parentId: parent.id, childId: user.id, depth, groupNo },
    });
    await ensureParentGroupSummary(tx, parent.id, groupNo);

    return { id: user.id, parentUsernameOrCode: referrerUsernameOrCode };
  });
}

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg } as Resp, { status: code });
}

function parseSuffix(username: string, prefix: string): number | null {
  if (!username.startsWith(prefix)) return null;
  const tail = username.slice(prefix.length);
  if (!/^\d+$/.test(tail)) return null;
  const n = Number(tail);
  return Number.isInteger(n) ? n : null;
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json()) as PostBody;

    const start = Number(raw.start);
    const end = Number(raw.end);
    const count = raw.count === undefined ? undefined : Number(raw.count);
    const prefix = (raw.prefix ?? "test").trim();
    const pad = Number(raw.pad ?? 3);
    const root = (raw.root ?? "").trim();
    const password =
      raw.password ?? process.env.DEFAULT_SIGNUP_PASSWORD ?? "Test1234!";
    const country = raw.country ?? undefined;
    const dry = !!raw.dry;
    const bcryptCost = Number(raw.bcryptCost ?? 12);
    const delayMs = Number(raw.delayMs ?? 0);

    // ▶ attachByLevel 파라미터
    const parentLevel =
      raw.parentLevel === undefined ? undefined : Number(raw.parentLevel);
    const attachPerParent =
      raw.attachPerParent === undefined
        ? undefined
        : Number(raw.attachPerParent);
    const parentFilterPrefix =
      (raw.parentFilterPrefix ?? "").trim() || undefined;
    const parentLimitRaw =
      raw.parentLimit === undefined ? undefined : Number(raw.parentLimit);
    const parentLimit =
      Number.isInteger(parentLimitRaw) && (parentLimitRaw as number) > 0
        ? (parentLimitRaw as number)
        : 200;

    if (!prefix) return bad("prefix required");
    if (!root) return bad("root required");
    if (!Number.isInteger(pad) || pad < 0) return bad("pad must be >= 0");
    if (!Number.isInteger(bcryptCost) || bcryptCost < 4 || bcryptCost > 15)
      return bad("bcryptCost must be 4..15");
    if (!Number.isFinite(delayMs) || delayMs < 0)
      return bad("delayMs must be >= 0");

    const rootUser = await resolveUser(root);
    if (!rootUser) return bad(`Root referrer not found: ${root}`);
    const countryCode = await countryIfExists(country);

    // ▶ attachByLevel 모드 판단
    const isAttachByLevel =
      Number.isInteger(parentLevel) &&
      (parentLevel as number) > 0 &&
      Number.isInteger(attachPerParent) &&
      (attachPerParent as number) > 0;

    // 공통 결과 수집
    const items: ItemResult[] = [];
    let created = 0,
      skipped = 0,
      dryCount = 0,
      errors = 0;
    let lastParent = root;

    // 공통: 이미 존재하는 prefix 사용 번호 추출(빠른 next 번호 생성용)
    const existing = await prisma.user.findMany({
      where: { username: { startsWith: prefix } },
      select: { username: true },
      orderBy: { username: "asc" },
    });
    const used = new Set<number>();
    for (const u of existing) {
      const n = parseSuffix(u.username, prefix);
      if (n !== null) used.add(n);
    }
    // next 빈 번호를 반환하는 제너레이터
    const nextFreeNumber = (() => {
      let n = 1;
      return () => {
        while (used.has(n)) n++;
        used.add(n);
        return n++;
      };
    })();

    if (isAttachByLevel) {
      // ────────── 특정 레벨 부모 모드 ──────────
      const parents = await prisma.user.findMany({
        where: {
          level: parentLevel as number,
          ...(parentFilterPrefix
            ? { username: { startsWith: parentFilterPrefix } }
            : {}),
        },
        select: { id: true, username: true },
        orderBy: { username: "asc" },
        take: parentLimit,
      });

      if (!parents.length) {
        return NextResponse.json({
          ok: true,
          summary: {
            requested: 0,
            created: 0,
            skipped: 0,
            dry: 0,
            errors: 0,
            lastParent,
            mode: "attachByLevel",
            parentsUsed: 0,
          },
          items: [],
        } as Resp);
      }

      const totalToCreate = (attachPerParent as number) * parents.length;

      for (const p of parents) {
        for (let i = 0; i < (attachPerParent as number); i++) {
          const n = nextFreeNumber();
          const username = `${prefix}${padNum(n, pad)}`;
          const email = `${username}@example.com`;

          if (dry) {
            items.push({ n, username, status: "DRY", referrer: p.username });
            dryCount++;
          } else {
            try {
              // 레이스 대비 최종 중복 확인
              const exists = await prisma.user.findUnique({
                where: { username },
                select: { id: true },
              });
              if (exists) {
                items.push({ n, username, status: "SKIPPED_EXISTS" });
                skipped++;
              } else {
                const user = await createUserInChain({
                  username,
                  email,
                  password,
                  name: username,
                  referrerUsernameOrCode: p.username,
                  countryCode,
                  bcryptCost,
                });
                items.push({
                  n,
                  username,
                  status: "CREATED",
                  id: user.id,
                  referrer: p.username,
                });
                created++;
                lastParent = p.username; // 의미적 표시
              }
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              items.push({ n, username, status: "ERROR", message: msg });
              errors++;
            }
          }

          if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      const summary = {
        requested: totalToCreate,
        created,
        skipped,
        dry: dryCount,
        errors,
        lastParent,
        mode: "attachByLevel" as const,
        parentsUsed: parents.length,
      };
      return NextResponse.json({ ok: true, summary, items } as Resp);
    }

    // ────────── 기존: count 모드 / 범위 모드 ──────────
    // 모드 판별
    const isCountMode = start === 0 && end === 0;
    if (isCountMode) {
      if (!Number.isInteger(count) || !count || count <= 0) {
        return bad("count must be a positive integer when start=end=0");
      }
    } else {
      if (!Number.isInteger(start) || start <= 0)
        return bad("start must be integer >= 1");
      if (!Number.isInteger(end) || end <= 0)
        return bad("end must be integer >= 1");
      if (end < start) return bad("end must be >= start");
    }

    if (isCountMode) {
      let taken = 0;
      while (taken < (count as number)) {
        const n = nextFreeNumber();
        const username = `${prefix}${padNum(n, pad)}`;
        const email = `${username}@example.com`;

        if (dry) {
          items.push({ n, username, status: "DRY", referrer: lastParent });
          lastParent = username;
          dryCount++;
        } else {
          try {
            const exists = await prisma.user.findUnique({
              where: { username },
              select: { id: true },
            });
            if (exists) {
              items.push({ n, username, status: "SKIPPED_EXISTS" });
              skipped++;
            } else {
              const user = await createUserInChain({
                username,
                email,
                password,
                name: username,
                referrerUsernameOrCode: lastParent,
                countryCode,
                bcryptCost,
              });
              items.push({
                n,
                username,
                status: "CREATED",
                id: user.id,
                referrer: lastParent,
              });
              lastParent = username;
              created++;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            items.push({ n, username, status: "ERROR", message: msg });
            errors++;
          }
        }

        taken++;
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      }

      const summary = {
        requested: count as number,
        created,
        skipped,
        dry: dryCount,
        errors,
        lastParent,
        mode: "count" as const,
      };
      return NextResponse.json({ ok: true, summary, items } as Resp);
    }

    // 범위 모드
    for (let n = start; n <= end; n++) {
      const username = `${prefix}${padNum(n, pad)}`;
      const email = `${username}@example.com`;

      const exists = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (exists) {
        items.push({ n, username, status: "SKIPPED_EXISTS" });
        skipped++;
      } else if (dry) {
        items.push({ n, username, status: "DRY", referrer: lastParent });
        lastParent = username;
        dryCount++;
      } else {
        try {
          const user = await createUserInChain({
            username,
            email,
            password,
            name: username,
            referrerUsernameOrCode: lastParent,
            countryCode,
            bcryptCost,
          });
          items.push({
            n,
            username,
            status: "CREATED",
            id: user.id,
            referrer: lastParent,
          });
          lastParent = username;
          created++;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          items.push({ n, username, status: "ERROR", message: msg });
          errors++;
        }
      }

      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }

    const summary = {
      requested: end - start + 1,
      created,
      skipped,
      dry: dryCount,
      errors,
      lastParent,
      mode: "range" as const,
    };
    return NextResponse.json({ ok: true, summary, items } as Resp);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: message } as Resp, {
      status: 500,
    });
  }
}
