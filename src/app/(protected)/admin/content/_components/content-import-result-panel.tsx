"use client";

import { formatImportError } from "@/lib/admin-import-error";
import type {
  ImportFieldChange,
  ImportRowAddition,
  ImportRowUpdate,
} from "@/lib/admin-import-report";

export type ContentImportResultSummary = {
  processed: number;
  created: number;
  updated: number;
  unchangedCount: number;
  added: ImportRowAddition[];
  updatedRows: ImportRowUpdate[];
  errors: { rowNumber: number; message: string }[];
};

type ContentImportResultPanelProps = {
  summary: ContentImportResultSummary;
  entityLabel: string;
};

function truncateValue(value: string, max = 80): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function ChangeLine({ change }: { change: ImportFieldChange }) {
  const before = truncateValue(change.before || "(empty)");
  const after = truncateValue(change.after || "(empty)");
  const fullTitle = `${change.field}: ${change.before || "(empty)"} → ${change.after || "(empty)"}`;

  return (
    <li className="text-[12px] leading-snug text-[#555]" title={fullTitle}>
      <span className="font-medium text-[#4a4a4a]">{change.field}</span>: {before} → {after}
    </li>
  );
}

export function ContentImportResultPanel({ summary, entityLabel }: ContentImportResultPanelProps) {
  const summaryParts: string[] = [];
  if (summary.created > 0) summaryParts.push(`${summary.created} added`);
  if (summary.updated > 0) summaryParts.push(`${summary.updated} updated`);
  if (summary.unchangedCount > 0) summaryParts.push(`${summary.unchangedCount} unchanged`);
  if (summary.errors.length > 0) summaryParts.push(`${summary.errors.length} error${summary.errors.length === 1 ? "" : "s"}`);

  const summaryLine =
    summaryParts.length > 0 ? summaryParts.join(" · ") : `No ${entityLabel} changes`;

  return (
    <div className="rounded-[8px] border border-[#e0deda] bg-[#faf9f7] p-3 text-[13px] text-[#4a4a4a]">
      <p className="font-semibold text-[#1a1a1a]">{summaryLine}</p>
      <p className="mt-1 text-[12px] text-[#666]">Rows processed: {summary.processed}</p>

      {summary.added.length > 0 ? (
        <div className="mt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#2D6A4F]">
            Added
          </p>
          <ul className="mt-1.5 max-h-28 space-y-1 overflow-y-auto">
            {summary.added.map((item) => (
              <li key={`add-${item.rowNumber}-${item.name}`} className="text-[12px] text-[#4a4a4a]">
                Row {item.rowNumber}: {item.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.updatedRows.length > 0 ? (
        <div className="mt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#1d4ed8]">
            Updated
            {summary.updated > summary.updatedRows.length
              ? ` (showing ${summary.updatedRows.length} of ${summary.updated})`
              : null}
          </p>
          <ul className="mt-1.5 max-h-40 space-y-2 overflow-y-auto">
            {summary.updatedRows.map((item) => (
              <li
                key={`upd-${item.rowNumber}-${item.name}`}
                className="rounded-[6px] border border-[#ece9e4] bg-white px-2.5 py-2"
              >
                <p className="text-[12px] font-semibold text-[#1a1a1a]">
                  Row {item.rowNumber}: {item.name}
                </p>
                {item.changes.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {item.changes.map((change) => (
                      <ChangeLine key={`${item.rowNumber}-${change.field}`} change={change} />
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.errors.length > 0 ? (
        <div className="mt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-red-700">Errors</p>
          <ul className="mt-1.5 max-h-28 list-disc space-y-0.5 overflow-y-auto pl-5 text-[12px] text-red-700">
            {summary.errors.map((item) => {
              const message = formatImportError(item.message);
              return (
                <li key={`${item.rowNumber}-${message}`} className="break-words">
                  Row {item.rowNumber}: {message}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
