import AdminBroadcastForm from "@/components/shared/AdminBroadcastForm";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
      <p className="text-sm text-gray-500 max-w-xl">
        Send an in-app notification to a group of users. Banned users are
        excluded automatically.
      </p>
      <AdminBroadcastForm />
    </div>
  );
}
