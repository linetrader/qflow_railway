// src/app/admin/level/worker/api.ts
import type { Config, PutOk } from "@/types/admin/level-worker";

/* ---------- 안전 유틸 ---------- */
function safeParseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}
function stringifyUnknown(u: unknown): string {
  if (u === null || u === undefined) return "";
  if (typeof u === "string") return u;
  try {
    return JSON.stringify(u);
  } catch {
    return Object.prototype.toString.call(u);
  }
}
function buildErrorMessage(body: unknown, status: number): string {
  if (typeof body === "string" && body.length > 0) return body;
  if (body && typeof body === "object") {
    const maybe = body as { error?: unknown; details?: unknown };
    if (typeof maybe.error === "string") {
      const det = maybe.details ? ` ${stringifyUnknown(maybe.details)}` : "";
      return `${maybe.error}${det}`;
    }
    return stringifyUnknown(body);
  }
  return `HTTP_${status}`;
}

/* ---------- 타입 가드 ---------- */
function isConfig(u: unknown): u is Config {
  if (!u || typeof u !== "object") return false;
  const o = u as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.key === "string" &&
    typeof o.isActive === "boolean" &&
    typeof o.mode === "string" &&
    typeof o.workerId === "string" &&
    typeof o.intervalMs === "number" &&
    typeof o.burstRuns === "number" &&
    typeof o.batchSize === "number" &&
    typeof o.fetchLimit === "number" &&
    typeof o.stallMs === "number" &&
    typeof o.maxAgeMs === "number" &&
    typeof o.logLevel === "string" &&
    typeof o.maxChainDepth === "number" &&
    typeof o.heartbeatEverySteps === "number" &&
    typeof o.rescueGraceSec === "number" &&
    typeof o.leaseExpiredError === "string" &&
    ("stopAtUserId" in o
      ? typeof o.stopAtUserId === "string" || o.stopAtUserId === null
      : true) &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string"
  );
}
function isPutOk(u: unknown): u is PutOk {
  if (!u || typeof u !== "object") return false;
  const o = u as Record<string, unknown>;
  return o.ok === true && isConfig(o.config);
}

/* ---------- API ---------- */
export async function fetchConfig(signal?: AbortSignal): Promise<Config> {
  const r = await fetch("/api/admin/level/worker", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const text = await r.text();
  const body: unknown = safeParseJson(text);

  if (!r.ok) throw new Error(buildErrorMessage(body, r.status));
  if (isConfig(body)) return body;

  throw new Error(
    body ? `INVALID_RESPONSE ${stringifyUnknown(body)}` : "INVALID_RESPONSE"
  );
}

export async function putConfig(
  draft: Partial<Config>,
  signal?: AbortSignal
): Promise<Config> {
  const r = await fetch("/api/admin/level/worker", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(draft),
    signal,
  });

  const text = await r.text();
  const body: unknown = safeParseJson(text);

  if (!r.ok) throw new Error(buildErrorMessage(body, r.status));
  if (isPutOk(body)) return body.config;

  throw new Error(
    body ? `INVALID_RESPONSE ${stringifyUnknown(body)}` : "INVALID_RESPONSE"
  );
}
