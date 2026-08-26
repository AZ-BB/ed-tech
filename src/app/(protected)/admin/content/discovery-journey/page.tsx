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

  return (
    <AdminDiscoveryJourneyClient
      initialConfig={result.data.config}
      initialModulesContentAr={result.data.modulesContentAr}
      initialSettingsContentAr={result.data.settingsContentAr}
      initialSettingsRow={{
        scales_json: result.data.settings.scales_json,
        combined_profiles_json: result.data.settings.combined_profiles_json,
        content_ar: result.data.settings.content_ar ?? null,
        content_ar_meta: result.data.settings.content_ar_meta ?? null,
      }}
      initialModuleRows={result.data.moduleRows.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        content_json: row.content_json,
        content_ar: row.content_ar ?? null,
        content_ar_meta: row.content_ar_meta ?? null,
      }))}
    />
  );
}
