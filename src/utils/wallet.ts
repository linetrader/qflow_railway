import { getAddress, isAddress } from "ethers"; // v6 기준

/** 형식 + (혼용 대/소문자일 때) EIP-55 체크섬 검증 */
export function isValidEvmAddress(addr: string): boolean {
  return isAddress(addr);
}

/** 체크섬 정규화된 주소를 반환 (유효하지 않으면 null) */
export function toChecksumAddress(addr: string): string | null {
  try {
    return getAddress(addr);
  } catch {
    return null;
  }
}
