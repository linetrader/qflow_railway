// src/schemas/admin/packages.ts
import { z } from "zod";

/**
 * Shared primitives
 */
export const SortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof SortOrderSchema>;

export const IDSchema = z.string().min(1, "id is required");
export const ISODateTimeStringSchema = z.string().datetime(); // ISO 8601
export const DecimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "must be a decimal string");

/**
 * Pagination
 */
export const PageParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
});
export type PageParams = z.infer<typeof PageParamsSchema>;

/* =========================================================
 * 1) 패키지 유저 목록 (/admin/packages/user)
 * =======================================================*/

export const UserPackageFiltersSchema = z.object({
  // user filters
  username: z.string().min(1).optional(),
  countryCode: z.string().length(2).optional(),
  levelMin: z.number().int().min(0).optional(),
  levelMax: z.number().int().min(0).optional(),

  // package filters
  packageId: IDSchema.optional(),
  packageNameContains: z.string().min(1).optional(),

  // time range (UserPackage.createdAt)
  createdFrom: ISODateTimeStringSchema.optional(),
  createdTo: ISODateTimeStringSchema.optional(),
});
export type UserPackageFilters = z.infer<typeof UserPackageFiltersSchema>;

export const UserPackageSortKeySchema = z.enum([
  "username",
  "level",
  "countryCode",
  "packageName",
  "quantity",
  "createdAt",
  "updatedAt",
]);
export type UserPackageSortKey = z.infer<typeof UserPackageSortKeySchema>;

export const UserPackageSortSchema = z.object({
  key: UserPackageSortKeySchema,
  order: SortOrderSchema,
});
export type UserPackageSort = z.infer<typeof UserPackageSortSchema>;

export const UserPackageQuerySchema = z.object({
  filters: UserPackageFiltersSchema.default({}),
  sort: UserPackageSortSchema.optional(),
  page: PageParamsSchema.default({ page: 1, pageSize: 20 }),
});
export type UserPackageQuery = z.infer<typeof UserPackageQuerySchema>;

/* =========================================================
 * 2) 패키지 구매 내역 (/admin/packages/history)
 * =======================================================*/

export const PackageHistoryFiltersSchema = z.object({
  // user filters
  username: z.string().min(1).optional(),

  // package filters
  packageId: IDSchema.optional(),
  packageNameContains: z.string().min(1).optional(),

  // numeric filters
  quantityMin: z.number().int().min(0).optional(),
  quantityMax: z.number().int().min(0).optional(),

  // price filters
  unitPriceMin: DecimalStringSchema.optional(),
  unitPriceMax: DecimalStringSchema.optional(),
  totalPriceMin: DecimalStringSchema.optional(),
  totalPriceMax: DecimalStringSchema.optional(),

  // time range (createdAt)
  createdFrom: ISODateTimeStringSchema.optional(),
  createdTo: ISODateTimeStringSchema.optional(),
});
export type PackageHistoryFilters = z.infer<typeof PackageHistoryFiltersSchema>;

export const PackageHistorySortKeySchema = z.enum([
  "createdAt",
  "username",
  "packageName",
  "quantity",
  "unitPrice",
  "totalPrice",
]);
export type PackageHistorySortKey = z.infer<typeof PackageHistorySortKeySchema>;

export const PackageHistorySortSchema = z.object({
  key: PackageHistorySortKeySchema,
  order: SortOrderSchema,
});
export type PackageHistorySort = z.infer<typeof PackageHistorySortSchema>;

export const PackageHistoryQuerySchema = z.object({
  filters: PackageHistoryFiltersSchema.default({}),
  sort: PackageHistorySortSchema.optional(),
  page: PageParamsSchema.default({ page: 1, pageSize: 20 }),
});
export type PackageHistoryQuery = z.infer<typeof PackageHistoryQuerySchema>;

/* =========================================================
 * 3) 패키지-추천 플랜 매핑 (/admin/packages/referral-plan)
 * =======================================================*/

export const PackagePlanMappingFiltersSchema = z.object({
  packageNameContains: z.string().min(1).optional(),
  hasPlan: z.boolean().optional(),
  planId: IDSchema.optional(),
  planNameContains: z.string().min(1).optional(),
  planIsActive: z.boolean().optional(),
});
export type PackagePlanMappingFilters = z.infer<
  typeof PackagePlanMappingFiltersSchema
>;

export const PackagePlanMappingSortKeySchema = z.enum([
  "packageName",
  "planName",
  "planIsActive",
]);
export type PackagePlanMappingSortKey = z.infer<
  typeof PackagePlanMappingSortKeySchema
>;

export const PackagePlanMappingSortSchema = z.object({
  key: PackagePlanMappingSortKeySchema,
  order: SortOrderSchema,
});
export type PackagePlanMappingSort = z.infer<
  typeof PackagePlanMappingSortSchema
>;

export const PackagePlanMappingQuerySchema = z.object({
  filters: PackagePlanMappingFiltersSchema.default({}),
  sort: PackagePlanMappingSortSchema.optional(),
  page: PageParamsSchema.default({ page: 1, pageSize: 20 }),
});
export type PackagePlanMappingQuery = z.infer<
  typeof PackagePlanMappingQuerySchema
>;

/* =========================================================
 * Mutation Payloads
 * =======================================================*/

export const UpsertPackagePlanMappingPayloadSchema = z.object({
  packageId: IDSchema,
  // 매핑 해제: null 허용
  planId: z.union([IDSchema, z.null()]),
});
export type UpsertPackagePlanMappingPayload = z.infer<
  typeof UpsertPackagePlanMappingPayloadSchema
>;

/* =========================================================
 * Common Error Envelope (optional)
 * =======================================================*/

export const ApiErrorSchema = z.object({
  error: z.string().min(1),
  errorMessage: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
