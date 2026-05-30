import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { verifyOtp } from "@/core/auth/otp";

const bodySchema = z.object({
  phone: z.string().min(10).max(20),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const result = await verifyOtp(parsed.data.phone, parsed.data.otp);
    if (!result.ok) {
      return err(result.error, result.locked ? 429 : 400);
    }

    return ok({ valid: true });
  } catch (e) {
    return parseError(e);
  }
}
