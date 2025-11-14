import { PostVisibility } from "@/generated/prisma";

// 목록 아이템(제목 기준 리스트)
export interface AdminPostListItem {
  id: string;
  title: string;
  isPublished: boolean;
  createdAt: string; // ISO
}

// 상세 보기/수정용
export interface AdminPostDetail {
  id: string;
  title: string;
  bodyRaw: string | null;
  bodyHtml: string | null;
  visibility: keyof typeof PostVisibility extends never
    ? "PUBLIC" | "PRIVATE"
    : "PUBLIC" | "PRIVATE";
  isPublished: boolean;
  publishedAt: string | null; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// 작성/수정 제출 폼
export interface AdminPostFormInput {
  title: string;
  bodyRaw: string;
  bodyHtml: string;
  visibility: "PUBLIC" | "PRIVATE";
  isPublished: boolean;
}

// 공통 API 응답
export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: string;
}

export type AdminListResult = ApiOk<AdminPostListItem[]> | ApiErr;
export type AdminDetailResult = ApiOk<AdminPostDetail> | ApiErr;
export type AdminUpdateResult = ApiOk<{ id: string }> | ApiErr;
