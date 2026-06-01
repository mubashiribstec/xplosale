import crypto from "crypto";
import { kv, kvSet } from "@/core/adapters/kv";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const OTP_TTL = 300; // 5 minutes
const OTP_DIGITS = 6;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_LOCKOUT_WINDOW = 30 * 60; // 30 min in seconds

function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(OTP_DIGITS, "0");
}

function hashOtp(otp: string, phone: string): string {
  return crypto
    .createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(`${phone}:${otp}`)
    .digest("hex");
}

// Exported for CNIC verification (Phase 5): salted hash of the CNIC number
export function hashCnic(cnicNumber: string): string {
  return crypto
    .createHmac("sha256", env.CNIC_HASH_SALT)
    .update(cnicNumber)
    .digest("hex");
}

// Lua script: atomically check lockout, compare hash, increment failures, consume on success.
// Returns "locked" | "expired" | "invalid" | "ok"
const VERIFY_OTP_LUA = `
local attemptsKey = KEYS[1]
local hashKey = KEYS[2]
local expectedHash = ARGV[1]
local maxAttempts = tonumber(ARGV[2])
local lockoutWindow = tonumber(ARGV[3])

local attempts = tonumber(redis.call('GET', attemptsKey)) or 0
if attempts >= maxAttempts then
  return 'locked'
end

local storedHash = redis.call('GET', hashKey)
if storedHash == false then
  return 'expired'
end

if storedHash ~= expectedHash then
  redis.call('INCR', attemptsKey)
  redis.call('EXPIRE', attemptsKey, lockoutWindow)
  return 'invalid'
end

redis.call('DEL', hashKey)
redis.call('DEL', attemptsKey)
return 'ok'
`;

export async function sendOtp(
  phone: string,
  ip: string | null
): Promise<{ ok: true } | { ok: false; error: string; retryAfter?: number }> {
  // Per-phone rate limit: 3/hour
  const phoneLimit = await rateLimit(`otp:send:phone:${phone}`, 3, 3600);
  if (!phoneLimit.allowed) {
    return {
      ok: false,
      error: "Too many OTP requests for this number. Try again later.",
      retryAfter: phoneLimit.resetAt,
    };
  }

  // Per-IP rate limit: 5/hour. Fall back to a shared "no-ip" bucket when the
  // header is absent so an attacker cannot bypass by stripping x-forwarded-for.
  const effectiveIp = ip ?? "no-ip";
  const ipLimit = await rateLimit(`otp:send:ip:${effectiveIp}`, ip ? 5 : 20, 3600);
  if (!ipLimit.allowed) {
    return {
      ok: false,
      error: "Too many OTP requests from this IP. Try again later.",
      retryAfter: ipLimit.resetAt,
    };
  }

  const otp = generateOtp();
  const hash = hashOtp(otp, phone);

  await kvSet(`otp:hash:${phone}`, hash, OTP_TTL);
  // Intentionally do NOT reset otp:attempts — resetting on new OTP issuance
  // lets an attacker bypass the verify lockout by repeatedly sending new codes.

  // Audit row — fire-and-forget but log failures so infrastructure issues surface
  prisma.otpCode
    .create({
      data: {
        phone,
        codeHash: hash,
        expiresAt: new Date(Date.now() + OTP_TTL * 1000),
      },
    })
    .catch((e: unknown) => console.error("[OTP audit] Failed to write OtpCode row:", e));

  // MOCK SMS — logs to console only. Wire a real SMS provider in production.
  console.log(`[MOCK SMS] OTP for ${phone}: ${otp}`);

  return { ok: true };
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ ok: true } | { ok: false; error: string; locked?: boolean }> {
  const expectedHash = hashOtp(otp, phone);
  const attemptsKey = `otp:attempts:${phone}`;
  const hashKey = `otp:hash:${phone}`;

  // Single atomic Lua script: check lockout → compare → increment failures → consume on match.
  // Eliminates both the timing side-channel and the check-then-act race condition.
  const result = (await kv.eval(
    VERIFY_OTP_LUA,
    2,
    attemptsKey,
    hashKey,
    expectedHash,
    String(MAX_VERIFY_ATTEMPTS),
    String(VERIFY_LOCKOUT_WINDOW)
  )) as string;

  if (result === "locked") {
    return { ok: false, error: "Too many failed attempts. Please request a new OTP.", locked: true };
  }
  if (result === "expired") {
    return { ok: false, error: "OTP expired or not found. Please request a new one." };
  }
  if (result === "invalid") {
    return { ok: false, error: "Invalid OTP. Please try again." };
  }

  // result === "ok" — token consumed atomically by the Lua script
  prisma.otpCode
    .updateMany({
      where: { phone, consumedAt: null, codeHash: expectedHash },
      data: { consumedAt: new Date() },
    })
    .catch((e: unknown) => console.error("[OTP audit] Failed to mark OtpCode consumed:", e));

  return { ok: true };
}
