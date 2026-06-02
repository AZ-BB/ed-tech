"use client";

import { useCallback, useState, useTransition } from "react";

import type { AdminSchoolOption } from "../../users/_lib/fetch-admin-school-options";
import { fetchAdminReportsOverviewAction } from "../actions/fetch-admin-reports-overview";
import type { AdminReportsOverview } from "../_lib/report-payloads";

import { AdminReportsGenerator } from "./admin-reports-generator";
import { AdminReportsKpiGrid } from "./admin-reports-kpi-grid";

type Props = {
  initialOverview: AdminReportsOverview;
  schoolOptions: AdminSchoolOption[];
  defaultStartDate: string;
  defaultEndDate: string;
};

export function AdminReportsClient({
  initialOverview,
  schoolOptions,
  defaultStartDate,
  defaultEndDate,
}: Props) {
  const [overview, setOverview] = useState(initialOverview);
  const [, startTransition] = useTransition();

  const handleFiltersApplied = useCallback(
    (filters: { schoolId: string; startDate: string; endDate: string }) => {
      startTransition(async () => {
        const result = await fetchAdminReportsOverviewAction(filters);
        if (result.ok) setOverview(result.overview);
      });
    },
    [],
  );

  return (
    <div>
      <AdminReportsKpiGrid overview={overview} />
      <AdminReportsGenerator
        schoolOptions={schoolOptions}
        defaultStartDate={defaultStartDate}
        defaultEndDate={defaultEndDate}
        onFiltersApplied={handleFiltersApplied}
      />
    </div>
  );
}
