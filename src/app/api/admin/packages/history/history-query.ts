// src/app/api/admin/packages/history/history-query.ts
import { Prisma, PrismaClient } from "@/generated/prisma";
import type {
  PackageHistoryFilters,
  PackageHistorySort,
  PageParams,
} from "@/types/admin/packages/history";

const prisma = new PrismaClient();

export type PackageHistoryRow = {
  id: string;
  username: string;
  packageId: string;
  packageName: string;
  quantity: number;
  unitPrice: string; // Decimal 직렬화
  totalPrice: string; // Decimal 직렬화
  createdAt: string; // ISO
};

export type PackageHistoryListResponse = {
  items: PackageHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
};

function parseDateOrUndefined(input?: string): Date | undefined {
  if (!input) return undefined;
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

function decimalOrUndefined(input?: string): Prisma.Decimal | undefined {
  if (!input) return undefined;
  try {
    return new Prisma.Decimal(input);
  } catch {
    return undefined;
  }
}

function buildWhere(
  filters: PackageHistoryFilters
): Prisma.UserPackageHistoryWhereInput {
  const where: Prisma.UserPackageHistoryWhereInput = {};

  // user 조건 누적
  const userWhere: Prisma.UserWhereInput = {};
  if (filters.username) {
    userWhere.username = filters.username;
  }
  if (Object.keys(userWhere).length > 0) {
    where.user = userWhere;
  }

  // package 조건 누적
  const packageWhere: Prisma.PackageWhereInput = {};
  if (filters.packageNameContains) {
    packageWhere.name = {
      contains: filters.packageNameContains,
      mode: "insensitive",
    };
  }
  if (Object.keys(packageWhere).length > 0) {
    where.package = packageWhere;
  }

  // packageId
  if (filters.packageId) {
    where.packageId = filters.packageId;
  }

  // quantity 범위
  if (
    typeof filters.quantityMin === "number" ||
    typeof filters.quantityMax === "number"
  ) {
    where.quantity = {};
    if (typeof filters.quantityMin === "number") {
      where.quantity.gte = filters.quantityMin;
    }
    if (typeof filters.quantityMax === "number") {
      where.quantity.lte = filters.quantityMax;
    }
  }

  // unitPrice 범위 (Decimal)
  const unitMin = decimalOrUndefined(filters.unitPriceMin);
  const unitMax = decimalOrUndefined(filters.unitPriceMax);
  if (unitMin || unitMax) {
    where.unitPrice = {};
    if (unitMin) where.unitPrice.gte = unitMin;
    if (unitMax) where.unitPrice.lte = unitMax;
  }

  // totalPrice 범위 (Decimal)
  const totalMin = decimalOrUndefined(filters.totalPriceMin);
  const totalMax = decimalOrUndefined(filters.totalPriceMax);
  if (totalMin || totalMax) {
    where.totalPrice = {};
    if (totalMin) where.totalPrice.gte = totalMin;
    if (totalMax) where.totalPrice.lte = totalMax;
  }

  // createdAt 범위
  const createdFrom = parseDateOrUndefined(filters.createdFrom);
  const createdTo = parseDateOrUndefined(filters.createdTo);
  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) where.createdAt.gte = createdFrom;
    if (createdTo) where.createdAt.lte = createdTo;
  }

  return where;
}

function buildOrderBy(
  sort?: PackageHistorySort
): Prisma.UserPackageHistoryOrderByWithRelationInput | undefined {
  if (!sort) return undefined;

  switch (sort.key) {
    case "createdAt":
      return { createdAt: sort.order };
    case "username":
      return { user: { username: sort.order } };
    case "packageName":
      return { package: { name: sort.order } };
    case "quantity":
      return { quantity: sort.order };
    case "unitPrice":
      return { unitPrice: sort.order };
    case "totalPrice":
      return { totalPrice: sort.order };
    default:
      return undefined;
  }
}

export async function listPackageHistory(
  filters: PackageHistoryFilters,
  page: PageParams,
  sort?: PackageHistorySort
): Promise<PackageHistoryListResponse> {
  const where = buildWhere(filters);
  const orderBy = buildOrderBy(sort);

  const take = page.pageSize;
  const skip = (page.page - 1) * page.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.userPackageHistory.count({ where }),
    prisma.userPackageHistory.findMany({
      where,
      include: {
        user: { select: { username: true } },
        package: { select: { id: true, name: true } },
      },
      orderBy: orderBy ?? { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  const items: PackageHistoryRow[] = rows.map((r) => ({
    id: r.id,
    username: r.user.username,
    packageId: r.packageId,
    packageName: r.package.name,
    quantity: r.quantity,
    unitPrice: r.unitPrice.toString(),
    totalPrice: r.totalPrice.toString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    items,
    total,
    page: page.page,
    pageSize: page.pageSize,
  };
}
