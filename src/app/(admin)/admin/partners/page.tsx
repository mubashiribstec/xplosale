import { PartnerQueue } from "@/components/shared/PartnerQueue";

export default function AdminPartnersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Partner Applications</h1>
      <PartnerQueue />
    </div>
  );
}
