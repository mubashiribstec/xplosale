import { err } from "@/lib/http";

// Phone OTP authentication removed.
export async function POST() {
  return err("Phone authentication is not available.", 410);
}
