import { DiscoveryModuleFlow } from "../_components/discovery-module-flow";

export const dynamic = "force-dynamic";

export default async function StudentDiscoveryModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  return <DiscoveryModuleFlow moduleId={moduleId} />;
}
