import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user as { id: string; phone: string; name: string; role: string };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
            <p className="font-medium text-gray-900">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
            <p className="font-medium text-gray-900">{user.phone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
            <p className="font-medium text-gray-900">{user.role}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
