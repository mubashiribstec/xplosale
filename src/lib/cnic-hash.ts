import crypto from "crypto";
import { env } from "@/lib/env";

export function hashCnic(cnicNumber: string): string {
  return crypto
    .createHmac("sha256", env.CNIC_HASH_SALT)
    .update(cnicNumber)
    .digest("hex");
}
