import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSetupClient from "./_client";

export default async function AdminSetupPage() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (existingAdmin) redirect("/admin/login");
  return <AdminSetupClient />;
}
