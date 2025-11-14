// src/worker/level-recalc/workers/runner.ts
import { setTimeout as sleep } from "node:timers/promises";
import { workerOnce } from "./worker";
import { loadWorkerConfig, type LoadedWorkerConfig } from "./config-db";

let stopping = false;

function installSignalHandlers(): void {
  const onStop = (sig: string) => {
    console.log(`[runner] ${sig} received -> graceful stop`);
    stopping = true;
  };
  process.on("SIGINT", () => onStop("SIGINT"));
  process.on("SIGTERM", () => onStop("SIGTERM"));
}

function resolveMode(
  cliArgs: string[],
  cfgMode: LoadedWorkerConfig["mode"]
): "once" | "loop" {
  if (cliArgs.includes("--once")) return "once";
  if (cliArgs.includes("--loop")) return "loop";
  return cfgMode;
}

async function runOnce(cfg: LoadedWorkerConfig): Promise<void> {
  await workerOnce(cfg.workerId);
}

/**
 * loop 모드:
 * - 매 사이클 시작 전에 DB 설정 재로딩
 * - isActive=false면 sleep
 */
async function runLoop(initialCfg: LoadedWorkerConfig): Promise<void> {
  installSignalHandlers();
  console.log(
    `[runner] loop start (id=${initialCfg.workerId}). DB 설정을 매 사이클마다 재로딩합니다.`
  );

  while (!stopping) {
    let cfg: LoadedWorkerConfig;
    try {
      cfg = await loadWorkerConfig();
    } catch (e) {
      console.error("[runner] loadWorkerConfig error. 이전 설정으로 대기:", e);
      cfg = initialCfg;
    }

    console.debug?.(
      `[runner] cfg.stopAtUserId = ${cfg.stopAtUserId ?? "(null)"}`
    );

    if (!cfg.isActive) {
      const waitMs = Math.max(1000, cfg.intervalMs);
      console.log(`[runner] inactive -> skip; sleep ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }

    console.log(
      `[runner] tick: interval=${cfg.intervalMs}ms, burstRuns=${cfg.burstRuns}, id=${cfg.workerId}`
    );

    for (let i = 0; i < cfg.burstRuns && !stopping; i++) {
      try {
        await runOnce(cfg);
      } catch (e) {
        console.error("[runner] workerOnce error:", e);
      }
    }
    if (stopping) break;

    await sleep(cfg.intervalMs);
  }

  console.log("[runner] loop stopped");
}

async function main(): Promise<void> {
  const cfg0 = await loadWorkerConfig();
  console.debug?.(
    `[runner] cfg0.stopAtUserId = ${cfg0.stopAtUserId ?? "(null)"}`
  );

  const mode = resolveMode(process.argv.slice(2), cfg0.mode);
  console.log(`[runner] resolved mode = ${mode}`);

  if (mode === "loop") {
    await runLoop(cfg0);
  } else {
    await runOnce(cfg0);
  }
}

/** ESM 안전 가드 */
const directRun = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    const entryUrl = new URL(`file://${entry}`).href;
    return entryUrl === import.meta.url;
  } catch {
    return false;
  }
})();

if (directRun) {
  main().catch((e) => {
    console.error("[runner] fatal:", e);
    process.exit(1);
  });
}
