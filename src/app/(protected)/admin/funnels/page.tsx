import { AdminFunnelsClient } from "@/app/(protected)/admin/funnels/_components/admin-funnels-client";
import {
  getCustomWithFormFunnelStats,
  getDianaFunnelStats,
  getDynamicInfluencerFunnelStats,
  getMiladFunnelStats,
  getTariqFunnelStats,
} from "@/lib/funnel-stats";
import { listInfluencerFunnelsForAdmin } from "@/lib/influencer-funnels";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnels",
};

export default async function AdminFunnelsPage() {
  const [miladStats, dianaStats, tariqStats, customWithFormStats, influencerFunnelRows] =
    await Promise.all([
      getMiladFunnelStats(),
      getDianaFunnelStats(),
      getTariqFunnelStats(),
      getCustomWithFormFunnelStats(),
      listInfluencerFunnelsForAdmin(),
    ]);

  const dynamicInfluencerFunnels = await Promise.all(
    influencerFunnelRows.map(async (row) => ({
      id: row.id,
      displayName: row.display_name,
      slug: row.slug,
      calendlySchedulingUrl: row.calendly_scheduling_url,
      isActive: row.is_active,
      stats: await getDynamicInfluencerFunnelStats(row.slug),
    })),
  );

  return (
    <AdminFunnelsClient
      dynamicInfluencerFunnels={dynamicInfluencerFunnels}
      funnels={[
        {
          key: "milad",
          title: "Milad",
          stats: miladStats,
          color: "#2D6A4F",
        },
        {
          key: "diana",
          title: "Diana",
          stats: dianaStats,
          color: "#9B59B6",
        },
        {
          key: "tariq",
          title: "Tariq",
          stats: tariqStats,
          color: "#E67E22",
        },
        {
          key: "custom-with-form",
          title: "Custom with form",
          stats: customWithFormStats,
          color: "#3498DB",
        },
      ]}
    />
  );
}
