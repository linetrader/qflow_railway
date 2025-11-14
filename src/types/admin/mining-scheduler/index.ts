import type { MiningScheduleKind } from "@/generated/prisma";

export type MiningPolicyItem = {
  id: string;
  name: string | null;
};

export type MiningScheduleItem = {
  id: string;
  name: string | null;
  isActive: boolean;
  kind: MiningScheduleKind;
  policyId: string;
  policyName: string | null;
  intervalMinutes: number | null;
  dailyAtMinutes: number | null;
  timezone: string | null;
  daysOfWeekMask: number | null;
  nextRunAt: string | null; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type ListResponse = {
  schedules: MiningScheduleItem[];
  policies: MiningPolicyItem[];
};

export type CreateScheduleBody = {
  name?: string | null;
  policyId: string;
  isActive: boolean;
  kind: MiningScheduleKind;
  intervalMinutes?: number | null;
  dailyAtMinutes?: number | null;
  timezone?: string | null;
  daysOfWeekMask?: number | null;
};

export type CreateScheduleOk = {
  ok: true;
  id: string;
};

export type ToggleActiveBody = {
  id: string;
  isActive: boolean;
};

export type RunStopBody = {
  id: string;
  currentlyActive: boolean;
};

export type DeleteBody = {
  id: string;
};

export type MutateOk = { ok: true };
export type ErrorRes = { ok: false; error: string; details?: unknown };
