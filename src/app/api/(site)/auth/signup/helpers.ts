// src/app/api/(site)/auth/signup/helpers.ts
import crypto from "crypto";

export function normalizeInput(s?: string | null) {
  if (!s) return "";
  return s.normalize("NFKC").trim();
}

export function generateReferralCode() {
  const rand = crypto.randomBytes(6).toString("hex").toUpperCase(); // 12 hex
  const t = Date.now().toString(36).toUpperCase();
  return (t + rand).toUpperCase();
}
