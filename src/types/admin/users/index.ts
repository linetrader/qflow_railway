// src/types/admin/users/index.ts
export type UserRow = {
  id: string;
  username: string;
  email: string;
  name: string;
  referralCode: string;
  level: number;
  countryCode: string | null;
  googleOtpEnabled: boolean;
  createdAt: string; // ISO
};

export type UsersApiResp = {
  page: number;
  size: number;
  total: number;
  items: UserRow[];
};

export const SORT_OPTIONS = [
  { label: "최근 생성 ↓", value: "createdAt:desc" },
  { label: "최근 생성 ↑", value: "createdAt:asc" },
  { label: "아이디 ↑", value: "username:asc" },
  { label: "아이디 ↓", value: "username:desc" },
  { label: "이름 ↑", value: "name:asc" },
  { label: "이름 ↓", value: "name:desc" },
  { label: "이메일 ↑", value: "email:asc" },
  { label: "이메일 ↓", value: "email:desc" },
  { label: "레벨 ↓", value: "level:desc" },
  { label: "레벨 ↑", value: "level:asc" },
] as const;

export const PAGE_SIZES = [10, 20, 50, 100, 200] as const;
