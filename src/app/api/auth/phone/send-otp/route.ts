import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { sendOtp } from "@/core/auth/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone?: string };
    const phone = body.phone?.trim();
    if (!phone || !/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
      return err("Invalid phone number", 422);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const result = await sendOtp(phone, ip);
    if (!result.ok) return err(result.error, 429);
    return ok({ sent: true });
  } catch (e) {
    return parseError(e);
  }
}
