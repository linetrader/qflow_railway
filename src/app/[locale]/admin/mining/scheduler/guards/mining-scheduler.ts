import type {
  ListResponse,
  MiningPolicyItem,
  MiningScheduleItem,
  CreateScheduleOk,
  MutateOk,
  ErrorRes,
} from "@/types/admin/mining-scheduler";

function isStr(u: unknown): u is string {
  return typeof u === "string";
}
function isBool(u: unknown): u is boolean {
  return typeof u === "boolean";
}
function isNumOrNull(u: unknown): u is number | null {
  return (typeof u === "number" && Number.isFinite(u)) || u === null;
}
function isStrOrNull(u: unknown): u is string | null {
  return typeof u === "string" || u === null;
}
function isRec(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null;
}

export function isPolicyItem(u: unknown): u is MiningPolicyItem {
  if (!isRec(u)) return false;
  return isStr(u.id) && (isStr(u.name) || u.name === null);
}

export function isScheduleItem(u: unknown): u is MiningScheduleItem {
  if (!isRec(u)) return false;
  return (
    isStr(u.id) &&
    (isStr(u.name) || u.name === null) &&
    isBool(u.isActive) &&
    isStr(u.kind) &&
    isStr(u.policyId) &&
    (isStr(u.policyName) || u.policyName === null) &&
    isNumOrNull(u.intervalMinutes) &&
    isNumOrNull(u.dailyAtMinutes) &&
    isStrOrNull(u.timezone) &&
    (typeof u.daysOfWeekMask === "number" || u.daysOfWeekMask === null) &&
    (isStr(u.nextRunAt) || u.nextRunAt === null) &&
    isStr(u.createdAt) &&
    isStr(u.updatedAt)
  );
}

export function isListResponse(u: unknown): u is ListResponse {
  if (!isRec(u)) return false;
  const s = (u as { schedules?: unknown }).schedules;
  const p = (u as { policies?: unknown }).policies;
  if (!Array.isArray(s) || !Array.isArray(p)) return false;
  return s.every(isScheduleItem) && p.every(isPolicyItem);
}

export function isCreateOk(u: unknown): u is CreateScheduleOk {
  return (
    isRec(u) &&
    (u as { ok?: unknown }).ok === true &&
    isStr((u as { id?: unknown }).id)
  );
}

export function isMutateOk(u: unknown): u is MutateOk {
  return isRec(u) && (u as { ok?: unknown }).ok === true;
}

export function isErrorRes(u: unknown): u is ErrorRes {
  return (
    isRec(u) &&
    (u as { ok?: unknown }).ok === false &&
    isStr((u as { error?: unknown }).error)
  );
}
