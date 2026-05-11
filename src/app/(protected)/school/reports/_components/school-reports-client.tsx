"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SchoolReportsPayload } from "../_lib/fetch-school-reports";

const REPORT_SCOPE = "school-reports-print-root";
const OUTCOMES_PAGE_SIZE = 15;

/** Scoped CSS from Teacher Portal reference — literals only, no var(--*). */
const REPORT_CSS = `
.${REPORT_SCOPE}{font-family:'DM Sans',ui-sans-serif,system-ui,sans-serif;color:#1a1a1a;-webkit-font-smoothing:antialiased}
.${REPORT_SCOPE} .panel{background:#ffffff;border:1px solid #ece9e4;border-radius:14px;overflow:hidden;margin-bottom:18px}
.${REPORT_SCOPE} .panel-head{padding:18px 20px;border-bottom:1px solid #ece9e4;display:flex;align-items:center;justify-content:space-between;gap:12px}
.${REPORT_SCOPE} .panel-title{font-size:15px;font-weight:600;color:#1a1a1a;letter-spacing:-0.01em;display:flex;align-items:center;gap:8px}
.${REPORT_SCOPE} .panel-title-icon{width:24px;height:24px;border-radius:6px;background:#e8f5ee;color:#2d6a4f;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.${REPORT_SCOPE} .panel-title-icon svg{width:13px;height:13px}
.${REPORT_SCOPE} .panel-sub{font-size:12px;color:#6a6a6a;margin-top:2px}
.${REPORT_SCOPE} .panel-actions{display:flex;gap:8px;align-items:center}
.${REPORT_SCOPE} .panel-body{padding:18px 20px}
.${REPORT_SCOPE} .btn{padding:7px 14px;background:#ffffff;border:1.5px solid #e0deda;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;color:#4a4a4a;display:inline-flex;align-items:center;gap:6px;line-height:1}
.${REPORT_SCOPE} .btn:hover{border-color:#40916c;color:#1b4332;background:#f0f7f2}
.${REPORT_SCOPE} .btn.primary{background:#2d6a4f;border-color:#2d6a4f;color:#ffffff}
.${REPORT_SCOPE} .btn.primary:hover{background:#1b4332;border-color:#1b4332;color:#ffffff}
.${REPORT_SCOPE} .btn.primary:disabled{opacity:0.55;cursor:not-allowed}
.${REPORT_SCOPE} .btn.sm{padding:5px 10px;font-size:11.5px}
.${REPORT_SCOPE} .rpt-card{padding:24px;border:2px solid #52b788;border-radius:14px;background:linear-gradient(135deg,#f0f7f2 0%,#ffffff 60%);position:relative}
.${REPORT_SCOPE} .rpt-month{font-size:11.5px;color:#2d6a4f;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
.${REPORT_SCOPE} .rpt-h{font-family:'DM Serif Display',Georgia,serif;font-size:24px;letter-spacing:-0.01em;margin-bottom:16px;font-weight:400;color:#1a1a1a;line-height:1.2}
.${REPORT_SCOPE} .rpt-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px}
.${REPORT_SCOPE} .rpt-stat{padding:12px 14px;background:#ffffff;border:1px solid #ece9e4;border-radius:10px}
.${REPORT_SCOPE} .rpt-stat-num{font-family:'DM Serif Display',Georgia,serif;font-size:22px;color:#1b4332;line-height:1;font-weight:400}
.${REPORT_SCOPE} .rpt-stat-lab{font-size:11px;color:#6a6a6a;margin-top:4px}
.${REPORT_SCOPE} .rpt-two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:8px}
.${REPORT_SCOPE} .rpt-section-label{font-size:12px;font-weight:600;color:#1b4332;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.${REPORT_SCOPE} .rpt-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.${REPORT_SCOPE} .rpt-list-item{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(45,106,79,0.08)}
.${REPORT_SCOPE} .rpt-list-item:last-child{border-bottom:none}
.${REPORT_SCOPE} .rpt-list-item .lab{color:#4a4a4a}
.${REPORT_SCOPE} .rpt-list-item .val{color:#1a1a1a;font-weight:600}
.${REPORT_SCOPE} .rpt-engage{margin-top:16px;padding-top:14px;border-top:1px solid rgba(45,106,79,0.12);font-size:13px;color:#4a4a4a;line-height:1.5}
.${REPORT_SCOPE} .rpt-engage strong{color:#1a1a1a;font-weight:600}
.${REPORT_SCOPE} .split-2{display:grid;grid-template-columns:1.5fr 1fr;gap:18px;margin-top:18px}
.${REPORT_SCOPE} .mini-list{display:flex;flex-direction:column;gap:10px}
.${REPORT_SCOPE} .mini-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ece9e4}
.${REPORT_SCOPE} .mini-row:last-child{border-bottom:none}
.${REPORT_SCOPE} .mini-name{font-size:13px;color:#1a1a1a;font-weight:500;letter-spacing:-0.005em}
.${REPORT_SCOPE} .mini-num{font-size:12px;color:#4a4a4a;font-weight:600;min-width:22px;text-align:right}
.${REPORT_SCOPE} .att-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #ece9e4;gap:16px;cursor:pointer}
.${REPORT_SCOPE} .att-row:last-child{border-bottom:none}
.${REPORT_SCOPE} .att-row:first-child{padding-top:6px}
.${REPORT_SCOPE} .att-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
.${REPORT_SCOPE} .att-name{font-weight:600;font-size:13.5px;color:#1a1a1a;letter-spacing:-0.005em}
.${REPORT_SCOPE} .att-issue{font-size:12px;color:#4a4a4a;max-width:320px;line-height:1.45;margin-top:3px}
.${REPORT_SCOPE} .out-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:12.5px}
.${REPORT_SCOPE} .out-tbl thead th{text-align:left;padding:10px 14px;font-size:10.5px;font-weight:600;color:#6a6a6a;text-transform:uppercase;letter-spacing:0.06em;background:#faf9f4;border-bottom:1px solid #ece9e4;white-space:nowrap}
.${REPORT_SCOPE} .out-tbl tbody td{padding:11px 14px;border-bottom:1px solid #ece9e4;color:#1a1a1a;vertical-align:middle}
.${REPORT_SCOPE} .out-tbl tbody tr:last-child td{border-bottom:none}
.${REPORT_SCOPE} .out-tbl tbody tr{cursor:pointer}
.${REPORT_SCOPE} .cell-name{display:flex;align-items:center;gap:10px}
.${REPORT_SCOPE} .cell-avatar{width:26px;height:26px;border-radius:50%;background:#e8f5ee;color:#1b4332;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:600;flex-shrink:0}
.${REPORT_SCOPE} .cell-mute{color:#6a6a6a;font-size:12.5px}
.${REPORT_SCOPE} .pb{display:flex;align-items:center;gap:8px;min-width:120px}
.${REPORT_SCOPE} .pb-track{flex:1;height:6px;background:#ece9e4;border-radius:4px;overflow:hidden;min-width:60px}
.${REPORT_SCOPE} .pb-fill{height:100%;border-radius:4px}
.${REPORT_SCOPE} .pb-fill.green{background:#52b788}
.${REPORT_SCOPE} .pb-fill.amber{background:#d4a22a}
.${REPORT_SCOPE} .pb-fill.red{background:#e74c3c}
.${REPORT_SCOPE} .pb-num{font-size:12px;font-weight:600;color:#4a4a4a;min-width:36px;text-align:right}
.${REPORT_SCOPE} .pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600;line-height:1.4;white-space:nowrap}
.${REPORT_SCOPE} .pill .dot{width:6px;height:6px;border-radius:50%}
.${REPORT_SCOPE} .pill.red{background:rgba(231,76,60,0.12);color:#8c2d22}
.${REPORT_SCOPE} .pill.red .dot{background:#e74c3c}
.${REPORT_SCOPE} .pill.amber{background:rgba(212,162,42,0.14);color:#7a5d10}
.${REPORT_SCOPE} .pill.amber .dot{background:#d4a22a}
.${REPORT_SCOPE} .out-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
.${REPORT_SCOPE} .out-stat{padding:14px;background:linear-gradient(135deg,#f0f7f2 0%,#ffffff 100%);border:1px solid #e8f5ee;border-radius:10px}
.${REPORT_SCOPE} .out-stat-num{font-family:'DM Serif Display',Georgia,serif;font-size:22px;color:#1b4332;line-height:1;font-weight:400}
.${REPORT_SCOPE} .out-stat-lab{font-size:11px;color:#4a4a4a;margin-top:4px}
.${REPORT_SCOPE} .out-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid #ece9e4;flex-wrap:wrap}
.${REPORT_SCOPE} .out-pager-meta{font-size:12px;color:#6a6a6a}
.${REPORT_SCOPE} .out-pager-nav{display:flex;align-items:center;gap:8px}
@media (max-width:1100px){.${REPORT_SCOPE} .split-2{grid-template-columns:1fr}}
@media (max-width:760px){.${REPORT_SCOPE} .rpt-stats{grid-template-columns:repeat(2,1fr)}.${REPORT_SCOPE} .rpt-two-col{grid-template-columns:1fr}.${REPORT_SCOPE} .out-summary{grid-template-columns:repeat(2,1fr)}}
`;

async function exportReportToPdf(container: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(container, {
    scale: Math.min(
      2,
      typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2,
    ),
    useCORS: true,
    logging: false,
    scrollY: -window.scrollY,
    scrollX: -window.scrollX,
    windowWidth: container.scrollWidth,
    windowHeight: container.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 10;
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const imgW = pdfW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  let heightLeft = imgH;
  let position = margin;

  pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
  heightLeft -= pdfH - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgH - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
    heightLeft -= pdfH - margin * 2;
  }

  pdf.save(filename);
}

type Props = {
  data: SchoolReportsPayload;
};

export function SchoolReportsClient({ data }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [outcomesPage, setOutcomesPage] = useState(1);

  const outcomesTotal = data.outcomes.length;
  const outcomesTotalPages = Math.max(
    1,
    Math.ceil(outcomesTotal / OUTCOMES_PAGE_SIZE),
  );

  useEffect(() => {
    setOutcomesPage((p) => Math.min(p, outcomesTotalPages));
  }, [outcomesTotalPages]);

  const pagedOutcomeIndexes = useMemo(() => {
    const start = (outcomesPage - 1) * OUTCOMES_PAGE_SIZE;
    const end = start + OUTCOMES_PAGE_SIZE;
    return { start, end };
  }, [outcomesPage]);

  const handleExportPdf = useCallback(async () => {
    const el = rootRef.current;
    if (!el) return;

    const restores: { el: HTMLElement; display: string }[] = [];
    el.querySelectorAll("tr[data-outcome-index]").forEach((node) => {
      const row = node as HTMLElement;
      const idx = Number(row.dataset.outcomeIndex);
      if (Number.isNaN(idx)) return;
      const visible =
        idx >= pagedOutcomeIndexes.start && idx < pagedOutcomeIndexes.end;
      if (!visible) {
        restores.push({ el: row, display: row.style.display });
        row.style.display = "table-row";
      }
    });

    setExporting(true);
    try {
      await exportReportToPdf(el, `school-report-${data.monthKey}.pdf`);
    } catch (e) {
      console.error("[SchoolReportsClient] PDF export failed:", e);
    } finally {
      restores.forEach(({ el: row, display }) => {
        row.style.display = display;
      });
      setExporting(false);
    }
  }, [data.monthKey, pagedOutcomeIndexes.end, pagedOutcomeIndexes.start]);

  const fullTitle = `${data.schoolName} — University Guidance Report`;

  const navigateStudent = (id: string) => {
    router.push(`/school/students/${id}`);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: REPORT_CSS }} />
      <div ref={rootRef} id={REPORT_SCOPE} className={REPORT_SCOPE}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">
                <div className="panel-title-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  </svg>
                </div>
                School reports
              </div>
              <div className="panel-sub">
                Auto-generated monthly summaries for school leadership
              </div>
            </div>
            <div className="panel-actions">
              <button
                type="button"
                className="btn primary sm"
                disabled={exporting}
                onClick={() => void handleExportPdf()}
              >
                {exporting ? "Generating PDF…" : "Export monthly report"}
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="rpt-card">
              <div className="rpt-month">
                Monthly Snapshot · {data.monthLabel}
              </div>
              <div className="rpt-h">{fullTitle}</div>
              <div className="rpt-stats">
                <div className="rpt-stat">
                  <div className="rpt-stat-num">{data.totalStudents}</div>
                  <div className="rpt-stat-lab">Total students</div>
                </div>
                <div className="rpt-stat">
                  <div className="rpt-stat-num">{data.activeStudentsMonth}</div>
                  <div className="rpt-stat-lab">Active this month</div>
                </div>
                <div className="rpt-stat">
                  <div className="rpt-stat-num">{data.needAttentionCount}</div>
                  <div className="rpt-stat-lab">Need attention</div>
                </div>
                <div className="rpt-stat">
                  <div className="rpt-stat-num">{data.appsSubmittedMonth}</div>
                  <div className="rpt-stat-lab">Apps submitted</div>
                </div>
              </div>
              <div className="rpt-two-col">
                <div>
                  <div className="rpt-section-label">Top destinations</div>
                  <div className="rpt-list">
                    {data.topDestinations.length === 0 ? (
                      <div className="rpt-list-item">
                        <span className="lab">—</span>
                        <span className="val">0 students</span>
                      </div>
                    ) : (
                      data.topDestinations.map((d) => (
                        <div key={d.label} className="rpt-list-item">
                          <span className="lab">{d.label}</span>
                          <span className="val">{d.count} students</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="rpt-section-label">Top programs</div>
                  <div className="rpt-list">
                    {data.topPrograms.length === 0 ? (
                      <div className="rpt-list-item">
                        <span className="lab">—</span>
                        <span className="val">0 students</span>
                      </div>
                    ) : (
                      data.topPrograms.map((p) => (
                        <div key={p.label} className="rpt-list-item">
                          <span className="lab">{p.label}</span>
                          <span className="val">{p.count} students</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="rpt-engage">
                Engagement: <strong>{data.advisorSessionsMonth}</strong> advisor
                sessions · <strong>{data.ambassadorSessionsMonth}</strong>{" "}
                ambassador conversations ·{" "}
                <strong>{data.essayReviewsMonth}</strong> essay reviews ·{" "}
                <strong>{data.webinarsMonth}</strong> webinars
              </div>
            </div>

            <div className="panel" style={{ marginTop: "18px" }}>
              <div className="panel-head">
                <div>
                  <div className="panel-title">
                    <div className="panel-title-icon" aria-hidden>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                    Student outcomes
                  </div>
                  <div className="panel-sub">
                    Per-student destinations, programs, and application progress
                  </div>
                </div>
              </div>
              <div
                className="panel-body flush"
                style={{ padding: "18px 20px" }}
              >
                <div className="out-summary">
                  <div className="out-stat">
                    <div className="out-stat-num">{data.outcomes.length}</div>
                    <div className="out-stat-lab">Graduating students</div>
                  </div>
                  <div className="out-stat">
                    <div className="out-stat-num">—</div>
                    <div className="out-stat-lab">Applications submitted</div>
                  </div>
                  <div className="out-stat">
                    <div className="out-stat-num">—</div>
                    <div className="out-stat-lab">Offers received</div>
                  </div>
                  <div className="out-stat">
                    <div className="out-stat-num">—</div>
                    <div className="out-stat-lab">Students with ≥1 offer</div>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="out-tbl">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Destination</th>
                        <th>Programs</th>
                        <th>Apps submitted</th>
                        <th>Offers</th>
                        <th>Top offer</th>
                        <th>Profile completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.outcomes.map((o, rowIndex) => {
                        const pbClass =
                          o.profilePercent >= 80
                            ? "green"
                            : o.profilePercent >= 50
                              ? "amber"
                              : "red";
                        const submittedPart = `${o.applicationsSubmitted}/${o.applicationsTotal}`;
                        const rowVisible =
                          rowIndex >= pagedOutcomeIndexes.start &&
                          rowIndex < pagedOutcomeIndexes.end;
                        return (
                          <tr
                            key={o.studentId}
                            data-outcome-index={rowIndex}
                            style={{
                              display: rowVisible ? "table-row" : "none",
                            }}
                            onClick={() => navigateStudent(o.studentId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigateStudent(o.studentId);
                              }
                            }}
                            tabIndex={0}
                          >
                            <td>
                              <div className="cell-name">
                                <div className="cell-avatar">{o.initials}</div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "12.5px",
                                  }}
                                >
                                  {[o.firstName, o.lastName]
                                    .filter(Boolean)
                                    .join(" ") || "—"}
                                </div>
                              </div>
                            </td>
                            <td className="cell-mute">
                              {o.destinationsSummary}
                            </td>
                            <td className="cell-mute">{o.programsSummary}</td>
                            <td>{submittedPart}</td>
                            <td className="cell-mute">—</td>
                            <td
                              className="cell-mute"
                              style={{ fontSize: "12px" }}
                            >
                              —
                            </td>
                            <td>
                              <div className="pb">
                                <div className="pb-track">
                                  <div
                                    className={`pb-fill ${pbClass}`}
                                    style={{ width: `${o.profilePercent}%` }}
                                  />
                                </div>
                                <span className="pb-num">
                                  {o.profilePercent}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="out-pager">
                    <div className="out-pager-meta">
                      {outcomesTotal === 0 ? (
                        "No students to show."
                      ) : (
                        <>
                          Showing{" "}
                          <strong style={{ color: "#1a1a1a" }}>
                            {pagedOutcomeIndexes.start + 1}
                          </strong>
                          –
                          <strong style={{ color: "#1a1a1a" }}>
                            {Math.min(pagedOutcomeIndexes.end, outcomesTotal)}
                          </strong>{" "}
                          of{" "}
                          <strong style={{ color: "#1a1a1a" }}>
                            {outcomesTotal}
                          </strong>
                        </>
                      )}
                    </div>
                    <div className="out-pager-nav">
                      <button
                        type="button"
                        className="btn sm"
                        disabled={outcomesPage <= 1 || outcomesTotal === 0}
                        onClick={() =>
                          setOutcomesPage((p) => Math.max(1, p - 1))
                        }
                      >
                        Previous
                      </button>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#4a4a4a",
                          minWidth: "88px",
                          textAlign: "center",
                        }}
                      >
                        Page {outcomesPage} / {outcomesTotalPages}
                      </span>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={
                          outcomesPage >= outcomesTotalPages ||
                          outcomesTotal === 0
                        }
                        onClick={() =>
                          setOutcomesPage((p) =>
                            Math.min(outcomesTotalPages, p + 1),
                          )
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="split-2">
              <div className="panel">
                <div className="panel-head">
                  <div className="panel-title">Engagement summary</div>
                </div>
                <div className="panel-body">
                  <div className="mini-list">
                    <div className="mini-row">
                      <div className="mini-name">Advisor sessions booked</div>
                      <div className="mini-num">
                        {data.advisorSessionsMonth}
                      </div>
                    </div>
                    <div className="mini-row">
                      <div className="mini-name">
                        Ambassador sessions booked
                      </div>
                      <div className="mini-num">
                        {data.ambassadorSessionsMonth}
                      </div>
                    </div>
                    <div className="mini-row">
                      <div className="mini-name">
                        Essays / documents reviewed
                      </div>
                      <div className="mini-num">{data.essayReviewsMonth}</div>
                    </div>
                    <div className="mini-row">
                      <div className="mini-name">Webinars attended</div>
                      <div className="mini-num">{data.webinarsMonth}</div>
                    </div>
                    <div className="mini-row">
                      <div className="mini-name">Universities shortlisted</div>
                      <div className="mini-num">
                        {data.universitiesShortlistedMonth}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-head">
                  <div className="panel-title">Students at risk</div>
                </div>
                <div className="panel-body">
                  {data.attentionStudents.length === 0 ? (
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#6a6a6a",
                        padding: "8px 0",
                      }}
                    >
                      No students flagged this cycle.
                    </div>
                  ) : (
                    data.attentionStudents.map((s) => (
                      <div
                        key={s.id}
                        className="att-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigateStudent(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigateStudent(s.id);
                          }
                        }}
                      >
                        <div className="att-left">
                          <div className="cell-avatar">{s.initials}</div>
                          <div>
                            <div className="att-name">
                              {[s.firstName, s.lastName]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </div>
                            <div className="att-issue">{s.issue}</div>
                          </div>
                        </div>
                        <span className={`pill ${s.riskClass}`}>
                          <span className="dot" />
                          {s.riskClass === "red" ? "Urgent" : "Follow-up"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
