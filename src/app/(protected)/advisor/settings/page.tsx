import { redirect } from "next/navigation";

import { AdvisorSettingsClient } from "./_components/advisor-settings-client";
import { fetchAdvisorSettingsPage } from "./_lib/fetch-advisor-settings-page";

export default async function AdvisorSettingsPage() {
  const payload = await fetchAdvisorSettingsPage();

  if (!payload) {
    redirect("/login");
  }

  return <AdvisorSettingsClient {...payload} />;
}
