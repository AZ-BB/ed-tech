"use client";

import { useCallback, useState } from "react";

import type { AdminSchoolOption } from "../../users/_lib/fetch-admin-school-options";
import { generateAdminReport } from "../actions/generate-admin-report";
import {
  ADMIN_REPORT_TYPES,
  ADMIN_REPORT_TYPE_LABELS,
  type AdminReportType,
} from "../_lib/report-types";

type Props = {
  schoolOptions: AdminSchoolOption[];
  defaultStartDate: string;
  defaultEndDate: string;
  onFiltersApplied?: (filters: {
    schoolId: string;
    startDate: string;
    endDate: string;
  }) => void;
};

export function AdminReportsGenerator({
  schoolOptions,
  defaultStartDate,
  defaultEndDate,
  onFiltersApplied,
}: Props) {
  const [schoolId, setSchoolId] = useState("");
  const [reportType, setReportType] = useState<AdminReportType>("monthly_summary");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    onFiltersApplied?.({ schoolId, startDate, endDate });
    try {
      const result = await generateAdminReport({
        schoolId,
        startDate,
        endDate,
        reportType,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { downloadAdminReportPdf: download } = await import(
        "../_lib/build-admin-report-pdf"
      );
      download(result.payload);
    } catch (e) {
      console.error("[AdminReportsGenerator]", e);
      setError("Could not generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [schoolId, startDate, endDate, reportType, onFiltersApplied]);

  return (
    <div className="mb-6 overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="border-b border-[#ece9e4] px-5 py-4">
        <h2 className="text-[15px] font-bold text-[#1a1a1a]">Generate Report</h2>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="report-school"
                className="mb-1 block text-[11px] font-semibold text-[#a0a0a0]"
              >
                School
              </label>
              <select
                id="report-school"
                className="w-full cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[12px] text-[#4a4a4a]"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
              >
                <option value="">All Schools</option>
                {schoolOptions.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="report-type"
                className="mb-1 block text-[11px] font-semibold text-[#a0a0a0]"
              >
                Report Type
              </label>
              <select
                id="report-type"
                className="w-full cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[12px] text-[#4a4a4a]"
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as AdminReportType)
                }
              >
                {ADMIN_REPORT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ADMIN_REPORT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-[#a0a0a0]">
                Date Range
              </span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  aria-label="Start date"
                  className="w-full rounded-[8px] border border-[#e0deda] px-3 py-2 text-[13px] text-[#1a1a1a]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <input
                  type="date"
                  aria-label="End date"
                  className="w-full rounded-[8px] border border-[#e0deda] px-3 py-2 text-[13px] text-[#1a1a1a]"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-[#a0a0a0]">
                Format
              </span>
              <button
                type="button"
                disabled={generating}
                onClick={() => void handleGenerate()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                {generating ? "Generating PDF…" : "Generate PDF"}
              </button>
            </div>
            {error ? (
              <p className="text-[12px] font-medium text-[#E74C3C]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
