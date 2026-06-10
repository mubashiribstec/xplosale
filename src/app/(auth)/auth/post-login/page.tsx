import { auth } from "@/core/auth/auth.edge";
import { redirect } from "next/navigation";

// Role-based landing page after any sign-in method.
// login/page.tsx and verify/page.tsx both use callbackUrl="/auth/post-login".
export default async function PostLoginPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string } | undefined)?.role;
  if (role === "ADMIN") redirect("/admin");
  if (role === "PARTNER") redirect("/partner");
  redirect("/me");
}
