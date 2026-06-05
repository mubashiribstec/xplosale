import * as path from "path";

export const BASIC_AUTH = path.join(__dirname, "../.auth/basic.json");
export const VERIFIED_AUTH = path.join(__dirname, "../.auth/verified.json");
export const ADMIN_AUTH = path.join(__dirname, "../.auth/admin.json");

export const TEST_USERS = {
  basic: { id: "test-basic-user-01", role: "USER", name: "Basic User" },
  verified: { id: "test-verified-user-01", role: "USER", name: "Verified User" },
  admin: { id: "test-admin-user-01", role: "ADMIN", name: "Admin User" },
};
