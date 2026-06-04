import { err } from "@/lib/http";

// Phone OTP authentication removed. This endpoint no longer exists.
export async function POST() {
  return err("Phone OTP authentication has been removed. Please sign in with Google.", 410);
}
