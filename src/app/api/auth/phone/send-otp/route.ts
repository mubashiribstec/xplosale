import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { sendOtp } from "@/core/auth/otp";

const bodySchema = z.object({
  phone: z.string().min(10).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Invalid phone number", 422, parsed.error.flatten().fieldErrors);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const result = await sendOtp(parsed.data.phone, ip);

    if (!result.ok) {
      return err(result.error, 429, { retryAfter: result.retryAfter });
    }

    return ok({ message: "OTP sent" });
  } catch (e) {
    return parseError(e);
  }
}
