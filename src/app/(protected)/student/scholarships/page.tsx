import { ScholarshipDiscovery } from "./_components/scholarship-discovery";
import { getScholarshipDiscoveryPrograms } from "./_lib/get-scholarship-discovery-programs";

export default async function StudentScholarshipsPage() {
  const scholarships = await getScholarshipDiscoveryPrograms();
  return <ScholarshipDiscovery scholarships={scholarships} />;
}
