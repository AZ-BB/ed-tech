"use client";

import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { getAdminInternshipDetailHref } from "../_lib/admin-internship-detail-href";
import type { AdminInternshipCountryOption } from "../_lib/fetch-admin-internship-country-options";
import type { AdminInternshipTableRow } from "../_lib/fetch-admin-internships-page";
import {
  ADMIN_INTERNSHIPS_FORMAT_FILTER_OPTIONS,
  ADMIN_INTERNSHIPS_PAY_TIER_FILTER_OPTIONS,
  ADMIN_INTERNSHIPS_SECTION_FILTER_OPTIONS,
  ADMIN_INTERNSHIPS_STATUS_FILTER_OPTIONS,
  type AdminInternshipsStatusFilter,
} from "../_lib/parse-admin-internships-search-params";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")";

const filterSelectClass =
  "min-w-[120px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (!isActive) {
    return (
      <span className="inline-flex rounded-full bg-[#f3f2f0] px-2.5 py-0.5 text-[10px] font-semibold text-[#8a8a8a]">
        Inactive
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[10px] font-semibold text-[#2D6A4F]">
      Active
    </span>
  );
}

function EditActionLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      title="View & edit"
      aria-label="View and edit internship"
      className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#e0deda] bg-white transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
      onClick={(event) => event.stopPropagation()}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-[14px] w-[14px]"
        aria-hidden
      >
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </Link>
  );
}

export type AdminInternshipsTableClientProps = {
  rows: AdminInternshipTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  section: string;
  country: string;
  format: string;
  payTier: string;
  status: AdminInternshipsStatusFilter;
  countryOptions: AdminInternshipCountryOption[];
};

export function AdminInternshipsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  section,
  country,
  format,
  payTier,
  status,
  countryOptions,
}: AdminInternshipsTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const filtersActive =
    q.trim().length > 0 ||
    section.trim().length > 0 ||
    country.trim().length > 0 ||
    format.trim().length > 0 ||
    payTier.trim().length > 0 ||
    status !== "";

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">Internships</h2>
          <span className="text-[11px] text-[#a0a0a0]">
            {totalRows.toLocaleString()} {totalRows === 1 ? "entry" : "entries"}
          </span>
        </div>

        <form
          className="flex min-w-[220px] flex-1 flex-wrap items-center justify-end gap-2"
          action={pathname}
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="limit" value={String(limit)} />

          <div className="relative w-full max-w-[220px]">
            <svg
              className="pointer-events-none absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#a0a0a0]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <label htmlFor="admin-internships-search" className="sr-only">
              Search internships
            </label>
            <input
              id="admin-internships-search"
              key={`${q}-${section}-${country}-${format}-${payTier}-${status}`}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search internships..."
              className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
            />
          </div>

          <select
            name="section"
            aria-label="Filter by section"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={section}
          >
            {ADMIN_INTERNSHIPS_SECTION_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-sections"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="country"
            aria-label="Filter by country"
            className={`${filterSelectClass} max-w-[180px]`}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={country}
          >
            <option value="">All Countries</option>
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="format"
            aria-label="Filter by format"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={format}
          >
            {ADMIN_INTERNSHIPS_FORMAT_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-formats"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="pay_tier"
            aria-label="Filter by pay tier"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={payTier}
          >
            {ADMIN_INTERNSHIPS_PAY_TIER_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-pay"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="status"
            aria-label="Filter by status"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={status}
          >
            {ADMIN_INTERNSHIPS_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-statuses"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="overflow-x-auto px-5 pb-1 pt-1 [zoom:0.95]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {[
                "Internship",
                "Provider",
                "Section",
                "Country",
                "Format",
                "Pay",
                "Status",
                "Saved By",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className={`border-b border-[#ece9e4] px-4 py-[10px] text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0] ${
                    heading === "Actions" ? "text-center" : "text-left"
                  }`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {filtersActive
                    ? "No internships match your filters."
                    : "No internships found."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";
                const detailHref = getAdminInternshipDetailHref(row.id);

                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-[#f0f7f2]"
                    onClick={() => router.push(detailHref)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(detailHref);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View ${row.name} details`}
                  >
                    <td className={`${cellBorder} px-4 py-3`}>
                      <div className="font-semibold text-[#1a1a1a]">
                        {row.name}
                      </div>
                      {row.needsReview ? (
                        <div className="mt-0.5 text-[11px] font-medium text-[#b45309]">
                          Needs review
                        </div>
                      ) : null}
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.provider}
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.sectionLabel}
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.countryLabel}
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.formatLabel}
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.payLabel}
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <StatusBadge isActive={row.isActive} />
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.savedCount.toLocaleString()} students
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-center`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex justify-center">
                        <EditActionLink href={detailHref} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#ece9e4] px-5 py-3">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={LIMIT_OPTIONS}
        />
      </div>
    </div>
  );
}
