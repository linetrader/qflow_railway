// src/worker/mining/level-bonus.ts

import { Decimal, MIN_MLM_LEVEL } from "./types";
import type { UplineNode } from "./types";
import { createPayout } from "./payout";
import { MiningRewardKind } from "@/generated/prisma";

/** DB 임계치(L1~L9)의 cap% 맵 구성 */
export function buildLevelThresholds(
  items: { level: number; pct: Decimal }[]
): Map<number, Decimal> {
  const m = new Map<number, Decimal>();
  for (const it of items) m.set(it.level, it.pct);
  return m;
}

/** 현재 인덱스 i에서 같은 레벨이 '연속으로' 이어지는 블록만 수령자로 선택 */
function contiguousRecipientsAt(
  upline: UplineNode[],
  i: number,
  sourceLevel: number
): string[] {
  const lvl = upline[i].level ?? 0;
  if (lvl < MIN_MLM_LEVEL || lvl < sourceLevel) return [];

  const recipients: string[] = [];
  for (let k = i; k < upline.length; k++) {
    const nk = upline[k];
    const lk = nk.level ?? 0;
    // 연속 블록이 끊기면 중단
    if (lk !== lvl) break;
    // 자격 필터: MIN_MLM_LEVEL & sourceLevel
    if (lk >= MIN_MLM_LEVEL && lk >= sourceLevel) {
      recipients.push(nk.userId);
    }
  }
  return recipients;
}

/**
 * 레벨 보너스 워터폴(Δcap%):
 * - levelPool(고정)을 100%로 간주
 * - child→parent 순으로 진행, cap(level) - maxCapSoFar 가 양수일 때만 분배
 * - 동일 레벨 다수가 연속 등장할 수 있으므로 '현재 위치의 연속 블록'만 균등분배
 * - 수령자 자격: level >= MIN_MLM_LEVEL & level >= sourceLevel
 */
export async function distributeLevelBonusByFlow(args: {
  runId: string;
  sourceUserId: string;
  sourceLevel: number;
  upline: UplineNode[]; // child→parent 순(1대, 2대, ...)
  levelPoolRemaining: Decimal; // 고정 레벨 풀
  levelThresholds: Map<number, Decimal>;
}) {
  if (args.levelPoolRemaining.lte(0)) return;

  let maxCapSoFar = new Decimal(0);

  for (let i = 0; i < args.upline.length; ) {
    const node = args.upline[i];
    const lvl = node.level ?? 0;

    // 자격 필터(레벨 보너스 수령 가능 레벨)
    if (lvl < MIN_MLM_LEVEL || lvl < args.sourceLevel) {
      i++; // 다음 노드로
      continue;
    }

    const cap = args.levelThresholds.get(lvl) ?? new Decimal(0);
    const delta = cap.sub(maxCapSoFar);

    if (delta.gt(0)) {
      // 🔧 현재 인덱스에서의 '연속 동일 레벨 블록'만 수령자로 균등 분배
      const recipients = contiguousRecipientsAt(
        args.upline,
        i,
        args.sourceLevel
      );
      if (recipients.length > 0) {
        const portion = args.levelPoolRemaining.mul(delta).div(100);
        if (portion.gt(0)) {
          const each = portion.div(recipients.length);
          if (each.gt(0)) {
            for (const uid of recipients) {
              await createPayout({
                runId: args.runId,
                sourceUserId: args.sourceUserId,
                beneficiaryUserId: uid,
                kind: MiningRewardKind.MLM_LEVEL,
                amountDFT: each,
                awardLevel: lvl,
                splitCount: recipients.length,
              });
            }
          }
        }
      }
      maxCapSoFar = Decimal.max(maxCapSoFar, cap);
    } else {
      // Δcap ≤ 0 이면 분배 없음, maxCapSoFar만 갱신
      maxCapSoFar = Decimal.max(maxCapSoFar, cap);
    }

    // 다음 처리 위치: 지금 본 레벨과 같은 레벨의 '연속 블록'을 한 번에 건너뜀
    let j = i + 1;
    while (j < args.upline.length && (args.upline[j].level ?? 0) === lvl) j++;
    i = j;

    if (maxCapSoFar.gte(100)) break;
  }
}
