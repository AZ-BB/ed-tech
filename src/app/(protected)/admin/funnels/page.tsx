import { AdminFunnelsClient } from "@/app/(protected)/admin/funnels/_components/admin-funnels-client";
import {
  getCustomWithFormFunnelStats,
  getDianaFunnelStats,
  getMiladFunnelStats,
} from "@/lib/funnel-stats";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnels",
};

export default async function AdminFunnelsPage() {
  const [miladStats, dianaStats, customWithFormStats] = await Promise.all([
    getMiladFunnelStats(),
    getDianaFunnelStats(),
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
          key: "diana",
          title: "Diana",
          stats: dianaStats,
          color: "#9B59B6",
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
