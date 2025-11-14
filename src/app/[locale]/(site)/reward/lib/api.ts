// src/lib/rewards/api.ts
import type {
  FilterMode,
  NextCursor,
  RewardsPageResponse,
} from "@/types/reward";

type FetchRewardsPageParams = {
  filter: FilterMode;
  limit: number;
  cursor?: NextCursor | null;
};

export async function fetchRewardsPage(
  params: FetchRewardsPageParams
): Promise<RewardsPageResponse> {
  const qs = new URLSearchParams({
    filter: params.filter,
    limit: String(params.limit),
  });

  // NextCursor는 { kind, cursor: string } 형태 — 그대로 JSON 직렬화해서 보냄
  if (params.cursor) {
    qs.set("cursor", JSON.stringify(params.cursor));
  }

  const url = `/api/reward?${qs.toString()}`; // ✅ 라우터 경로와 정확히 일치
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "same-origin",
  });

  // HTML 방어: Content-Type 확인
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `Unexpected content-type (${ct}). status=${
        res.status
      }. body(head): ${text.slice(0, 200)}`
    );
  }

  const json = (await res.json()) as RewardsPageResponse;
  return json;
}
