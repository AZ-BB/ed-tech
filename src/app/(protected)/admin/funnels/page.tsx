import { AdminFunnelsClient } from "@/app/(protected)/admin/funnels/_components/admin-funnels-client";
import {
  getCustomWithFormFunnelStats,
  getMiladFunnelStats,
} from "@/lib/funnel-stats";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnels",
};

export default async function AdminFunnelsPage() {
  const [miladStats, customWithFormStats] = await Promise.all([
    getMiladFunnelStats(),
    getCustomWithFormFunnelStats(),
  ]);

  return (
    <AdminFunnelsClient
      funnels={[
        {
          key: "milad",
          title: "Milad",
          stats: miladStats,
          color: "#2D6A4F",
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
