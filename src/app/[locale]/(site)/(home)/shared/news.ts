// src/app/(site)/(home)/shared/news.ts
import type { Event, News } from "@/types/home";

export const NEWS: News[] = [
  {
    id: "n1",
    title: "플랫폼 신규 기능 오픈",
    date: "2025-09-01",
    tag: "업데이트",
  },
  { id: "n2", title: "보안 점검 완료 공지", date: "2025-08-27" },
  { id: "n3", title: "파트너사 제휴 소식", date: "2025-08-22", tag: "파트너" },
];

export const EVENTS: Event[] = [
  {
    id: "e1",
    title: "9월 커뮤니티 AMA",
    date: "2025-09-10",
    location: "온라인",
  },
  { id: "e2", title: "DeepFlow 밋업", date: "2025-09-18", location: "Seoul" },
];
