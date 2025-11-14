// src/types/admin-level-worker/index.ts

export type WorkerMode = "once" | "loop";
export type WorkerLogLevel = "debug" | "info" | "warn" | "error";

export type Config = {
  id: string;
  key: string;
  isActive: boolean;
  mode: WorkerMode | string; // 백엔드 enum/문자열 혼재 대비
  workerId: string;
  intervalMs: number;
  burstRuns: number;
  batchSize: number;
  fetchLimit: number;
  stallMs: number;
  maxAgeMs: number;
  logLevel: WorkerLogLevel | string;
  maxChainDepth: number;
  heartbeatEverySteps: number;
  rescueGraceSec: number;
  leaseExpiredError: string;
  stopAtUserId: string | null; // ★ 추가
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type PutOk = { ok: true; config: Config };
