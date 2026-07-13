import { getAdminDiscoveryJourneyPageData } from "@/actions/admin-discovery-journey";
import { AdminDiscoveryJourneyClient } from "./_components/admin-discovery-journey-client";

export default async function AdminDiscoveryJourneyPage() {
  const result = await getAdminDiscoveryJourneyPageData();

  if (!result.ok || !result.data) {
    return (
      <div className="rounded-[12px] border border-red-200 bg-red-50 p-6 text-[14px] text-red-700">
        {result.ok ? "Failed to load discovery journey." : result.error}
      </div>
    );
  }

  return <AdminDiscoveryJourneyClient initialConfig={result.data.config} />;
}
