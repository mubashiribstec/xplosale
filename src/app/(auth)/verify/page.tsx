import { redirect } from "next/navigation";

// Phone OTP verification removed — redirect to login.
export default function VerifyPage() {
  redirect("/login");
}
