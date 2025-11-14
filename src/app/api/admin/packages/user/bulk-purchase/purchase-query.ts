// src/app/api/admin/packages/user/bulk-purchase/purchase-query.ts
import { Prisma, type PrismaClient } from "@/generated/prisma";

export type PurchaseItem = {
  packageId: string;
  units: number; // 정수, > 0
};

export type PurchaseResult = {
  historyIds: string[];
  totalUSD: string; // Decimal 직렬화 문자열
};

// 오버로드 시그니처
export async function purchaseForUser(
  db: PrismaClient,
  userId: string,
  items: ReadonlyArray<PurchaseItem>
): Promise<PurchaseResult>;
export async function purchaseForUser(
  db: Prisma.TransactionClient,
  userId: string,
  items: ReadonlyArray<PurchaseItem>
): Promise<PurchaseResult>;

// 구현
export async function purchaseForUser(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  items: ReadonlyArray<PurchaseItem>
): Promise<PurchaseResult> {
  if (!userId) throw new Error("userId is required");
  if (items.length === 0) throw new Error("items must not be empty");

  // 동일 packageId 합산
  const merged = new Map<string, number>();
  for (const it of items) {
    if (!it.packageId) throw new Error("packageId is required");
    if (!Number.isInteger(it.units) || it.units <= 0) {
      throw new Error(`units must be positive integer: ${it.packageId}`);
    }
    merged.set(it.packageId, (merged.get(it.packageId) ?? 0) + it.units);
  }
  const packageIds = Array.from(merged.keys());

  // 사전 존재 확인 (트랜잭션 밖에서 해도 무방)
  const [user, pkgs] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true } }),
    db.package.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, name: true, price: true },
    }),
  ]);
  if (!user) throw new Error("User not found");

  const pkgMap = new Map(pkgs.map((p) => [p.id, p]));
  for (const pid of packageIds) {
    if (!pkgMap.has(pid)) throw new Error(`Package not found: ${pid}`);
  }

  // 핵심 로직을 콜백으로 분리
  const run = async (tx: Prisma.TransactionClient): Promise<PurchaseResult> => {
    const historyIds: string[] = [];
    let total = new Prisma.Decimal(0);

    for (const pid of packageIds) {
      const units = merged.get(pid)!;
      const pkg = pkgMap.get(pid)!;

      const unitPrice = new Prisma.Decimal(pkg.price);
      const totalPrice = unitPrice.mul(units);

      await tx.userPackage.upsert({
        where: { userId_packageId: { userId, packageId: pid } },
        update: { quantity: { increment: units } },
        create: { userId, packageId: pid, quantity: units },
      });

      const h = await tx.userPackageHistory.create({
        data: {
          userId,
          packageId: pid,
          quantity: units,
          unitPrice,
          totalPrice,
        },
        select: { id: true, totalPrice: true },
      });

      historyIds.push(h.id);
      total = total.add(h.totalPrice);
    }

    return { historyIds, totalUSD: total.toString() };
  };

  // 타입 가드: PrismaClient 인 경우에만 $transaction 사용
  function hasTransaction(
    client: PrismaClient | Prisma.TransactionClient
  ): client is PrismaClient {
    // PrismaClient에는 $transaction이 있고, TransactionClient에는 없음
    return typeof (client as PrismaClient).$transaction === "function";
  }

  if (hasTransaction(db)) {
    return db.$transaction((tx) => run(tx));
  }
  // 이미 트랜잭션 컨텍스트인 경우
  return run(db);
}
