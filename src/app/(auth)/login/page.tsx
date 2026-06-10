import { auth } from "@/core/auth/auth.edge";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/auth/post-login");

  return <LoginForm />;
}
