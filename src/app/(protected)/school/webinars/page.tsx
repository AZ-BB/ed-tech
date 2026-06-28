import type { Metadata } from "next";

import { SchoolWebinarsClient } from "./_components/school-webinars-client";
import { fetchSchoolWebinarsPage } from "./_lib/fetch-school-webinars";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webinars",
};

export default async function SchoolWebinarsPage() {
  const webinars = await fetchSchoolWebinarsPage();
  return <SchoolWebinarsClient webinars={webinars} />;
}
