import type { EssayReviewFeedback } from "./essay-review-types";

/**
 * Builds a printable Essay Review report as a PDF (client-only; uses dynamic import of jsPDF).
 */
export async function buildEssayReviewReportPdf(
  fb: EssayReviewFeedback,
  essayPrompt: string,
  university: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const maxW = pageW - 2 * margin;
  const lineH = 5;
  let y = margin;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const setBodyStyle = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
  };

  /** Draws wrapped body text and advances `y`. */
  const paragraph = (text: string) => {
    setBodyStyle();
    const lines = doc.splitTextToSize(text.trim() || " ", maxW);
    const blockH = lines.length * lineH;
    ensureSpace(blockH + 1);
    doc.text(lines, margin, y);
    y += blockH + 2;
  };

  const title = (text: string, fontSizePt = 16) => {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSizePt);
    doc.setTextColor(27, 67, 50);
    doc.text(text, margin, y);
    y += 12;
    setBodyStyle();
  };

  const section = (text: string) => {
    y += 2;
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(27, 67, 50);
    doc.text(text.toUpperCase(), margin, y);
    y += 7;
    setBodyStyle();
  };

  title("Essay review report");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Generated ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`,
    margin,
    y,
  );
  y += 8;
  setBodyStyle();

  const p = essayPrompt.trim();
  const u = university.trim();
  if (p) {
    section("Prompt");
    paragraph(p);
  }
  if (u) {
    section("Target university");
    paragraph(u);
  }

  const st = fb._stats;
  section("Stats");
  paragraph(
    `${st.words} words · ${st.sentences} sentences · ${st.paragraphs} paragraphs · Overall score ${st.score}/100`,
  );

  if (!fb.is_valid_essay) {
    section("Not treated as a valid essay");
    paragraph(fb.invalid_reason ?? "(No reason given.)");
  }

  section("Overall assessment");
  paragraph(fb.assessment);

  if (fb.structure.length > 0) {
    section("Structure");
    for (const s of fb.structure) {
      paragraph(`• ${s.section} — ${s.rating}${s.note ? ` — ${s.note}` : ""}`);
    }
  }

  if (fb.strengths.length > 0) {
    section("Strengths");
    for (const s of fb.strengths) paragraph(`• ${s}`);
  }

  if (fb.improvements.length > 0) {
    section("Improvements");
    for (const s of fb.improvements) paragraph(`• ${s}`);
  }

  if (fb.suggestions.length > 0) {
    section("Rewrite suggestions");
    fb.suggestions.forEach((sug, i) => {
      paragraph(`#${i + 1} — Original: ${sug.original}`);
      paragraph(`Improved: ${sug.improved}`);
      paragraph(`Why: ${sug.reason}`);
      y += 1;
    });
  }

  if (fb.quality.length > 0) {
    section("Writing quality");
    for (const q of fb.quality) {
      const line = q.tip
        ? `${q.name} — ${q.rating}\n${q.tip}`
        : `${q.name} — ${q.rating}`;
      paragraph(line);
    }
  }

  section("Authenticity");
  paragraph(fb.authenticity.assessment);
  if (fb.authenticity.flags.length > 0) {
    for (const f of fb.authenticity.flags) paragraph(`• ${f}`);
  }

  section("Recommendation");
  paragraph(fb.recommendation);

  return doc.output("blob");
}

export async function downloadEssayReviewReportPdf(
  fb: EssayReviewFeedback,
  essayPrompt: string,
  university: string,
): Promise<void> {
  const blob = await buildEssayReviewReportPdf(fb, essayPrompt, university);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Essay_Review_Report.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
