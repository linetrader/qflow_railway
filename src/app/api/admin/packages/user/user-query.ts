// src/lib/admin/packages/user-query.ts
import { Prisma, PrismaClient } from "@/generated/prisma";
import type {
  UserPackageFilters,
  UserPackageSort, // keys: "username" | "level" | "quantity" | "createdAt" | "updatedAt"
  PageParams,
  UserPackageListResponse,
} from "@/types/admin/packages/user";

const prisma = new PrismaClient();

function parseDateOrUndefined(input?: string): Date | undefined {
  if (!input) return undefined;
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

function buildWhere(filters: UserPackageFilters): Prisma.UserPackageWhereInput {
  const where: Prisma.UserPackageWhereInput = {};

  // 관계 필터는 별도 객체에 누적 후, 있으면 한 번에 할당
  const userWhere: Prisma.UserWhereInput = {};
  if (filters.username) {
    userWhere.username = filters.username;
  }
  if (filters.countryCode) {
    // User.countryCode: String? 이므로 string | null | StringNullableFilter 허용
    userWhere.countryCode = filters.countryCode;
  }
  if (
    typeof filters.levelMin === "number" ||
    typeof filters.levelMax === "number"
  ) {
    userWhere.level = {};
    if (typeof filters.levelMin === "number")
      userWhere.level.gte = filters.levelMin;
    if (typeof filters.levelMax === "number")
      userWhere.level.lte = filters.levelMax;
  }
  if (Object.keys(userWhere).length > 0) {
    where.user = userWhere;
  }

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

  if (filters.packageId) {
    where.packageId = filters.packageId;
  }

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
  sort?: UserPackageSort
): Prisma.UserPackageOrderByWithRelationInput | undefined {
  if (!sort) return undefined;

  switch (sort.key) {
    case "username":
      return { user: { username: sort.order } };
    case "level":
      return { user: { level: sort.order } };
    case "quantity":
      return { quantity: sort.order };
    case "createdAt":
      return { createdAt: sort.order };
    case "updatedAt":
      return { updatedAt: sort.order };
    default:
      return undefined;
  }
}

/**
 * 라우트의 decodeRow가 기대하는 키(username, level, countryCode, packageId, packageName,
 * quantity, createdAt, updatedAt) 형태로 items를 반환합니다.
 */
export async function listUserPackages(
  filters: UserPackageFilters,
  page: PageParams,
  sort?: UserPackageSort
): Promise<
  UserPackageListResponse & {
    items: Array<{
      username: string;
      level: number;
      countryCode: string | null;
      packageId: string;
      packageName: string;
      quantity: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }
> {
  const where = buildWhere(filters);
  const orderBy = buildOrderBy(sort);

  const take = page.pageSize;
  const skip = (page.page - 1) * page.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.userPackage.count({ where }),
    prisma.userPackage.findMany({
      where,
      include: {
        user: { select: { username: true, level: true, countryCode: true } },
        package: { select: { id: true, name: true } },
      },
      orderBy: orderBy ?? { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  const items = rows.map((r) => ({
    username: r.user.username,
    level: r.user.level,
    countryCode: r.user.countryCode ?? null,
    packageId: r.packageId,
    packageName: r.package.name,
    quantity: r.quantity,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return {
    items,
    total,
    page: page.page,
    pageSize: page.pageSize,
  };
}
