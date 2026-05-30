import crypto from "crypto";
import { kvGet, kvSet, kvDel, kvIncr } from "@/core/adapters/kv";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const OTP_TTL = 300; // 5 minutes
const OTP_DIGITS = 6;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_LOCKOUT_WINDOW = 30 * 60; // 30 min in seconds

function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(OTP_DIGITS, "0");
}

function hashOtp(otp: string, phone: string): string {
  return crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "dev-secret")
    .update(`${phone}:${otp}`)
    .digest("hex");
}

export async function sendOtp(
  phone: string,
  ip: string
): Promise<{ ok: true } | { ok: false; error: string; retryAfter?: number }> {
  // Per-phone rate limit: 3/hour
  const phoneLimit = await rateLimit(`otp:send:phone:${phone}`, 3, 3600);
  if (!phoneLimit.allowed) {
    return { ok: false, error: "Too many OTP requests for this number. Try again later.", retryAfter: phoneLimit.resetAt };
  }

  // Per-IP rate limit: 5/hour
  const ipLimit = await rateLimit(`otp:send:ip:${ip}`, 5, 3600);
  if (!ipLimit.allowed) {
    return { ok: false, error: "Too many OTP requests from this IP. Try again later.", retryAfter: ipLimit.resetAt };
  }

  const otp = generateOtp();
  const hash = hashOtp(otp, phone);

  // Store hash in Redis
  await kvSet(`otp:hash:${phone}`, hash, OTP_TTL);
  // Reset attempt counter on fresh send
  await kvDel(`otp:attempts:${phone}`);

  // Write audit row (fire-and-forget, don't block on it)
  prisma.otpCode.create({
    data: {
      phone,
      codeHash: hash,
      expiresAt: new Date(Date.now() + OTP_TTL * 1000),
    },
  }).catch(() => {});

  // MOCK SMS — log to console only. Wire real SMS provider in production.
  console.log(`[MOCK SMS] OTP for ${phone}: ${otp}`);

  return { ok: true };
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ ok: true } | { ok: false; error: string; locked?: boolean }> {
  // Check lockout
  const attemptsKey = `otp:attempts:${phone}`;
  const attempts = parseInt((await kvGet(attemptsKey)) ?? "0", 10);
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, error: "Too many failed attempts. Please request a new OTP.", locked: true };
  }

  const storedHash = await kvGet(`otp:hash:${phone}`);
  if (!storedHash) {
    return { ok: false, error: "OTP expired or not found. Please request a new one." };
  }

  const expectedHash = hashOtp(otp, phone);
  if (expectedHash !== storedHash) {
    await kvIncr(attemptsKey, VERIFY_LOCKOUT_WINDOW);
    return { ok: false, error: "Invalid OTP. Please try again." };
  }

  // Valid — consume it
  await kvDel(`otp:hash:${phone}`);
  await kvDel(attemptsKey);

  // Mark audit row as consumed
  prisma.otpCode.updateMany({
    where: { phone, consumedAt: null, codeHash: storedHash },
    data: { consumedAt: new Date() },
  }).catch(() => {});

  return { ok: true };
}
