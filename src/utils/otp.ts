// 간단 Base32(A–Z2–7) 시크릿 생성 (데모용)
function getCrypto(): Crypto | undefined {
  if (typeof globalThis === "undefined") return undefined;
  // globalThis에 존재할 수 있는 필드만 좁혀서 접근
  const g = globalThis as unknown as { crypto?: Crypto; msCrypto?: Crypto };
  return g.crypto ?? g.msCrypto;
}

export function generateBase32(len: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let out = "";

  const cryptoObj = getCrypto();

  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buf = new Uint8Array(len);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < len; i++) {
      out += alphabet[buf[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < len; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }

  return out;
}
