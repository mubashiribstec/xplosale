import { VerificationQueue } from "@/components/shared/VerificationQueue";

export default async function AdminVerificationsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Verification Queue</h1>
        <VerificationQueue />
      </div>
    </main>
  );
}
