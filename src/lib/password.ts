import crypto from "crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, dkLen: 64 } as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_PARAMS.dkLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  }).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [, salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, SCRYPT_PARAMS.dkLen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
    });
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
  } catch {
    return false;
  }
}
