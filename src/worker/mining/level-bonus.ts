// src/worker/mining/level-bonus.ts
import { Decimal, MIN_MLM_LEVEL } from "./types";
import type { UplineNode } from "./types";
import { createPayout } from "./payout";
import { MiningRewardKind } from "@/generated/prisma";

/**
 * DB에서 가져온 레벨별 cap% 리스트를 Map(level → cap%) 으로 변환
 * - items: [{ level, pct }, ...]
 * - 반환: Map<number, Decimal>
 */
export function buildLevelThresholds(
  items: { level: number; pct: Decimal }[]
): Map<number, Decimal> {
  const m = new Map<number, Decimal>();
  for (const it of items) m.set(it.level, it.pct);
  return m;
}

/**
 * 현재 인덱스 i 기준으로 같은 레벨이 "연속"으로 이어지는 블록만 수령자로 사용
 *
 * - upline: child → parent 순으로 정렬된 체인
 * - i: 시작 인덱스
 * - sourceLevel: 소스 유저 레벨 (이보다 낮은 레벨은 보너스 자격 없음)
 *
 * 반환:
 * - 조건을 만족하는 userId 배열 (연속 동일 레벨 블록 범위 안에서만)
 */
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
    // 레벨이 바뀌면 연속 블록 종료
    if (lk !== lvl) break;
    // 자격 조건: 최소 레벨 + 소스 레벨 이상
    if (lk >= MIN_MLM_LEVEL && lk >= sourceLevel) {
      recipients.push(nk.userId);
    }
  }
  return recipients;
}

/**
 * 레벨 보너스 워터폴(Δcap%) 분배 로직
 *
 * 개념:
 * - levelPoolRemaining(고정 풀)을 100%로 볼 때,
 *   child → parent 순으로 올라가며 cap(level) - maxCapSoFar 의 양수분만 분배
 * - 한 레벨이 여러 노드에 연속으로 나타날 수 있으므로,
 *   "현재 인덱스에서 같은 레벨이 연속된 블록"만 수령자로 보고 균등분배
 * - 수령 자격:
 *   - level >= MIN_MLM_LEVEL
 *   - level >= sourceLevel (소스 유저보다 레벨이 낮으면 제외)
 */
export async function distributeLevelBonusByFlow(args: {
  runId: string;
  sourceUserId: string;
  sourceLevel: number;
  upline: UplineNode[]; // child→parent 순(1대, 2대, ...)
  levelPoolRemaining: Decimal; // 고정 레벨 풀 (100% 기준)
  levelThresholds: Map<number, Decimal>; // level → cap%
}) {
  if (args.levelPoolRemaining.lte(0)) return;

  // 지금까지 누적된 cap%(최대값)
  let maxCapSoFar = new Decimal(0);

  // child → parent 순으로 체인 스캔
  for (let i = 0; i < args.upline.length; ) {
    const node = args.upline[i];
    const lvl = node.level ?? 0;

    // 자격 필터(최소 레벨 + 소스 레벨 이상)
    if (lvl < MIN_MLM_LEVEL || lvl < args.sourceLevel) {
      i++;
      continue;
    }

    const cap = args.levelThresholds.get(lvl) ?? new Decimal(0);
    const delta = cap.sub(maxCapSoFar); // 이번 레벨에서 추가로 열리는 cap%

    if (delta.gt(0)) {
      // 현재 인덱스에서의 "연속 동일 레벨 블록" 수령자 목록
      const recipients = contiguousRecipientsAt(
        args.upline,
        i,
        args.sourceLevel
      );
      if (recipients.length > 0) {
        // levelPoolRemaining × (Δcap% / 100) 만큼 이번 레벨에게 배정
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
      // cap 증가분 반영
      maxCapSoFar = Decimal.max(maxCapSoFar, cap);
    } else {
      // Δcap ≤ 0 이면 분배 없음, 누적 cap만 갱신
      maxCapSoFar = Decimal.max(maxCapSoFar, cap);
    }

    // 다음 인덱스:
    //   지금 레벨과 같은 레벨의 연속 블록을 한 번에 건너뜀
    let j = i + 1;
    while (j < args.upline.length && (args.upline[j].level ?? 0) === lvl) j++;
    i = j;

    // cap이 100%에 도달하면 더 이상 분배할 여지가 없으므로 종료
    if (maxCapSoFar.gte(100)) break;
  }
}
