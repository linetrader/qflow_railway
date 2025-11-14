// src/lib/encrypt.ts
import crypto from "crypto";

/**
 * 앱 레벨 암호화 키 생성.
 * - 환경변수 DEPOSIT_ENC_SECRET(최소 16~32바이트 이상 랜덤)을 scrypt로 키 스트레칭.
 * - scrypt 파라미터를 명시적으로 지정 (N=2^14, r=8, p=1).
 * - 도메인 분리를 위한 고정 salt 문자열 사용(서비스 고유 문자열이면 더 좋음).
 */
function getKey() {
  const secret = process.env.DEPOSIT_ENC_SECRET || "";
  if (secret.length < 16) {
    throw new Error("DEPOSIT_ENC_SECRET is too weak or not set");
  }
  const salt = "deposit-addr-salt"; // 서비스 고유 식별자 권장
  const N = 1 << 14; // 16384
  const r = 8;
  const p = 1;
  return crypto.scryptSync(secret, salt, 32, { N, r, p }); // 32 bytes = 256-bit
}

/** 저장/계약용 Payload 타입 */
export type EncPayload = {
  ciphertextB64: string;
  ivB64: string; // 12-byte 권장
  tagB64: string; // 16-byte GCM tag
  alg: "aes-256-gcm";
  version: number; // 스키마의 depositKeyVersion과 매칭
};

/** 암호화: AES-256-GCM (iv=12바이트 랜덤) */
export function encryptTextAesGcm(plain: string): EncPayload {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce 권장
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertextB64: enc.toString("base64"),
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
    alg: "aes-256-gcm",
    version: 1,
  };
}

/** 복호화(저수준): 개별 B64 인자 */
export function decryptTextAesGcm_raw(
  ciphertextB64: string,
  ivB64: string,
  tagB64: string
): string {
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(ciphertextB64, "base64");
  if (iv.length !== 12) throw new Error("Invalid IV length for GCM");
  if (tag.length !== 16) throw new Error("Invalid GCM tag length");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

/** 복호화(고수준): EncPayload 계약을 그대로 받는 어댑터 */
export function decryptTextAesGcm(payload: EncPayload): string {
  if (payload.alg !== "aes-256-gcm") {
    throw new Error(`Unsupported alg: ${payload.alg}`);
  }
  // version은 필요 시 분기 처리 (ex. 다른 버전의 KDF/IV 정책)
  return decryptTextAesGcm_raw(
    payload.ciphertextB64,
    payload.ivB64,
    payload.tagB64
  );
}
