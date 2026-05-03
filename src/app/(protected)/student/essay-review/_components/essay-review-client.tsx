"use client";

import { useCallback, useMemo, useState } from "react";
import type { EssayReviewFeedback } from "../_lib/essay-review-types";

function wordCount(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

function ratingBadgeClass(rating: string) {
  const l = rating.toLowerCase();
  if (l === "strong") return "bg-[var(--green-bg)] text-[var(--green)]";
  if (l === "good" || l === "adequate") return "bg-[#FFF3E0] text-[#E65100]";
  return "bg-[#FCEBEB] text-[#C0392B]";
}

function downloadReport(
  fb: EssayReviewFeedback,
  essayPrompt: string,
  university: string,
) {
  let c = "ESSAY REVIEW REPORT\n" + "=".repeat(50) + "\n\n";
  const p = essayPrompt.trim();
  const u = university.trim();
  if (p) c += `PROMPT: ${p}\n`;
  if (u) c += `UNIVERSITY: ${u}\n`;
  const st = fb._stats;
  c += `STATS: ${st.words} words, ${st.sentences} sentences, ${st.paragraphs} paragraphs\n`;
  c += `OVERALL SCORE: ${st.score}/100\n`;
  if (!fb.is_valid_essay) {
    c += `\nNOT A VALID ESSAY:\n${fb.invalid_reason ?? ""}\n`;
  }
  c += `\nOVERALL ASSESSMENT:\n${fb.assessment}\n\nSTRUCTURE:\n`;
  fb.structure.forEach((s) => {
    c += `  ${s.section} > ${s.rating}${s.note ? ` - ${s.note}` : ""}\n`;
  });
  c += "\nSTRENGTHS:\n";
  fb.strengths.forEach((s) => {
    c += `  * ${s}\n`;
  });
  c += "\nIMPROVEMENTS:\n";
  fb.improvements.forEach((s) => {
    c += `  * ${s}\n`;
  });
  c += "\nREWRITES:\n";
  fb.suggestions.forEach((s, i) => {
    c += `\n  #${i + 1}\n  Original: "${s.original}"\n  Improved: "${s.improved}"\n  Why: ${s.reason}\n`;
  });
  c += "\nQUALITY:\n";
  fb.quality.forEach((q) => {
    c += `  ${q.name} > ${q.rating}\n`;
  });
  c += `\nAUTHENTICITY:\n${fb.authenticity.assessment}\n`;
  fb.authenticity.flags.forEach((f) => {
    c += `  * ${f}\n`;
  });
  c += `\nRECOMMENDATION:\n${fb.recommendation}\n`;
  const blob = new Blob([c], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Essay_Review_Report.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function EssayReviewClient() {
  const [essayPrompt, setEssayPrompt] = useState("");
  const [university, setUniversity] = useState("");
  const [essayText, setEssayText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<EssayReviewFeedback | null>(null);

  const wc = useMemo(() => wordCount(essayText), [essayText]);

  const showError = useCallback((msg: string) => {
    setError(msg);
    window.setTimeout(() => setError(null), 6000);
  }, []);

  const submit = useCallback(async () => {
    if (wc < 150) {
      showError("Please write at least 150 words for a meaningful review.");
      return;
    }
    setError(null);
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/ai/essay-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayText: essayText.trim(),
          essayPrompt: essayPrompt.trim(),
          university: university.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<EssayReviewFeedback>;
      if (!res.ok) {
        showError(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      setFeedback(data as EssayReviewFeedback);
      requestAnimationFrame(() => {
        document.getElementById("essay-review-results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch {
      showError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [essayPrompt, essayText, university, wc, showError]);

  const runAgain = useCallback(() => {
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const fieldLabelClass =
    "mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text)] [&>svg]:opacity-40";
  const inputClass =
    "w-full rounded-[10px] border-[1.5px] border-[var(--border)] bg-white px-4 py-3 font-[family-name:var(--font-dm-sans)] text-sm text-[var(--text)] transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)] focus:outline-none";

  return (
    <div className="mx-auto w-full pb-16">
      <div className="page-header mb-5 px-4">
        <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] text-[var(--text)] font-bold">
          Essay review
        </h1>
        <p className="mt-1 text-sm text-[var(--text-light)]">
          Get detailed, personalized feedback to strengthen your university application essays
        </p>
      </div>

      <div className="mb-5 rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] max-[600px]:px-5 max-[600px]:py-6">
        <div className="mb-5 grid grid-cols-2 gap-3.5 max-[600px]:grid-cols-1">
          <div>
            <label className={fieldLabelClass} htmlFor="essay-prompt">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              Essay prompt{" "}
              <span className="ml-1 font-normal text-[12px] text-[var(--text-hint)]">
                (optional but recommended)
              </span>
            </label>
            <textarea
              id="essay-prompt"
              className={`${inputClass} min-h-[60px] resize-none`}
              placeholder="e.g. Why do you want to study this program?"
              value={essayPrompt}
              onChange={(e) => setEssayPrompt(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="essay-uni">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              University{" "}
              <span className="ml-1 font-normal text-[12px] text-[var(--text-hint)]">(optional)</span>
            </label>
            <input
              id="essay-uni"
              className={`${inputClass} h-[60px]`}
              placeholder="e.g. University of Toronto"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-5">
          <label className={fieldLabelClass} htmlFor="essay-text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            Your essay
          </label>
          <textarea
            id="essay-text"
            className={`${inputClass} min-h-[280px] resize-y rounded-[var(--radius)] leading-[1.75]`}
            placeholder="Paste your personal statement or application essay here..."
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-hint)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              Minimum 150 words for a meaningful review
            </span>
            <span className="text-[12px] text-[var(--text-hint)]">
              <strong className="font-semibold text-[var(--text-mid)]">{wc}</strong> words
            </span>
          </div>
        </div>

        {error ? (
          <div
            className="mb-4 flex items-center gap-2 rounded-[var(--radius)] border border-[#f0c4c4] bg-[#FCEBEB] px-[18px] py-3 text-[13px] text-[#991b1b]"
            role="alert"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[var(--radius-pill)] border-0 bg-[var(--green)] py-3.5 pl-8 pr-8 font-[family-name:var(--font-dm-sans)] text-[15px] font-semibold text-white shadow-[0_2px_12px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)] disabled:pointer-events-none disabled:opacity-50"
          onClick={submit}
          disabled={loading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          Review my essay
        </button>

        {loading ? (
          <div className="py-10 text-center">
            <div
              className="mx-auto size-9 animate-spin rounded-full border-[3px] border-[var(--border-light)] border-t-[var(--green)]"
              aria-hidden
            />
            <p className="mt-3.5 text-sm text-[var(--text-light)]">
              Analyzing your essay
              <span className="inline animate-pulse">…</span>
            </p>
            <p className="mt-1 text-[12px] text-[var(--text-hint)]">
              Evaluating structure, clarity, specificity, and voice
            </p>
          </div>
        ) : null}
      </div>

      {feedback ? (
        <div id="essay-review-results" className="block">
          <div className="mb-3.5 flex flex-wrap gap-2">
            <div className="rounded-[var(--radius-pill)] border border-[var(--border-light)] bg-white px-3.5 py-1.5 text-[12px] text-[var(--text-light)]">
              <strong className="font-semibold text-[var(--text-mid)]">{feedback._stats.words}</strong> words
            </div>
            <div className="rounded-[var(--radius-pill)] border border-[var(--border-light)] bg-white px-3.5 py-1.5 text-[12px] text-[var(--text-light)]">
              <strong className="font-semibold text-[var(--text-mid)]">{feedback._stats.sentences}</strong> sentences
            </div>
            <div className="rounded-[var(--radius-pill)] border border-[var(--border-light)] bg-white px-3.5 py-1.5 text-[12px] text-[var(--text-light)]">
              <strong className="font-semibold text-[var(--text-mid)]">{feedback._stats.paragraphs}</strong> paragraphs
            </div>
            <div className="rounded-[var(--radius-pill)] border border-[var(--border-light)] bg-white px-3.5 py-1.5 text-[12px] text-[var(--text-light)]">
              Avg sentence:{" "}
              <strong className="font-semibold text-[var(--text-mid)]">{feedback._stats.avgSentLen}</strong> words
            </div>
            <div className="rounded-[var(--radius-pill)] border border-[var(--border-light)] bg-white px-3.5 py-1.5 text-[12px] text-[var(--text-light)]">
              Score:{" "}
              <strong className="font-semibold text-[var(--text-mid)]">{feedback._stats.score}</strong>/100
            </div>
          </div>

          {!feedback.is_valid_essay ? (
            <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[#f0c4c4] bg-[#FCEBEB] px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
              <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#991b1b]">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </span>
                Could not review this text
              </div>
              <p className="text-[14.5px] leading-relaxed text-[var(--text-mid)]">
                {feedback.invalid_reason ?? "The model could not treat this submission as an application essay."}
              </p>
            </div>
          ) : null}

          {feedback.is_valid_essay ? (
            <>
              <div className="mb-3.5 rounded-[var(--radius-lg)] border-[1.5px] border-[#c8dece] bg-[var(--green-pale)] px-6 py-5">
                <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--green-bg)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </span>
                  Overall assessment
                </div>
                <p className="text-[14.5px] leading-[1.7] text-[var(--text-mid)]">{feedback.assessment}</p>
              </div>

              {feedback.structure.length > 0 ? (
                <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F1FB]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" aria-hidden>
                        <path d="M4 7h16M4 12h16M4 17h10" />
                      </svg>
                    </span>
                    Structure analysis
                  </div>
                  <div className="flex flex-col gap-2">
                    {feedback.structure.map((s, i) => (
                      <div key={`${s.section}-${i}`}>
                        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border-light)] bg-[var(--sand)] px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[11px] font-semibold text-[var(--text-light)]">
                              {i + 1}
                            </span>
                            <span className="truncate text-[13px] font-medium">{s.section}</span>
                          </div>
                          <span
                            className={`shrink-0 rounded-[var(--radius-pill)] px-3.5 py-1 text-[11px] font-semibold ${ratingBadgeClass(s.rating)}`}
                          >
                            {s.rating}
                          </span>
                        </div>
                        {s.note ? (
                          <p className="mt-1 pl-8 text-[11.5px] leading-snug text-[var(--text-light)]">{s.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {feedback.strengths.length > 0 ? (
                <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--green-bg)]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    What works well
                  </div>
                  <ul className="flex flex-col gap-2">
                    {feedback.strengths.map((s) => (
                      <li key={s} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[var(--text-mid)]">
                        <span className="mt-1.5 size-[7px] shrink-0 rounded-full bg-[var(--green-light)]" aria-hidden />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {feedback.improvements.length > 0 ? (
                <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF3E0]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E65100" strokeWidth="2" aria-hidden>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                    </span>
                    Areas for improvement
                  </div>
                  <ul className="flex flex-col gap-2">
                    {feedback.improvements.map((s) => (
                      <li key={s} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[var(--text-mid)]">
                        <span className="mt-1.5 size-[7px] shrink-0 rounded-full bg-[#E65100]" aria-hidden />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {feedback.suggestions.length > 0 ? (
                <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#EEEDFE]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" aria-hidden>
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </span>
                    Sentence-level rewrites
                  </div>
                  <div className="flex flex-col gap-3.5">
                    {feedback.suggestions.map((s, i) => (
                      <div
                        key={i}
                        className="overflow-hidden rounded-[var(--radius)] border-[1.5px] border-[var(--border-light)]"
                      >
                        <div className="bg-[var(--sand)] px-[18px] py-3.5">
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.7px] text-[var(--text-hint)]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                            Original
                          </div>
                          <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">&ldquo;{s.original}&rdquo;</p>
                        </div>
                        <div className="border-t border-[#d5e8db] bg-[var(--green-pale)] px-[18px] py-3.5">
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.7px] text-[var(--green)]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            Suggested improvement
                          </div>
                          <p className="text-[13px] font-medium leading-relaxed text-[var(--text)]">
                            &ldquo;{s.improved}&rdquo;
                          </p>
                        </div>
                        {s.reason ? (
                          <div className="border-t border-[var(--border-light)] bg-white px-[18px] py-2.5">
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.7px] text-[#185FA5]">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4M12 8h.01" />
                              </svg>
                              Why
                            </div>
                            <p className="text-[12px] italic leading-relaxed text-[var(--text-light)]">{s.reason}</p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {feedback.quality.length > 0 ? (
                <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#FAEEDA]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2" aria-hidden>
                        <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
                      </svg>
                    </span>
                    Writing quality
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-[600px]:grid-cols-1">
                    {feedback.quality.map((q) => (
                      <div
                        key={q.name}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--sand)] px-3.5 py-2.5"
                      >
                        <span className="group relative flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
                          <span className="truncate">{q.name}</span>
                          {q.tip ? (
                            <span className="relative inline-flex shrink-0 cursor-help">
                              <span className="flex size-4 items-center justify-center rounded-full border-[1.5px] border-[var(--border)] text-[9px] font-bold text-[var(--text-hint)] transition group-hover:border-[var(--green-light)] group-hover:bg-[var(--green-bg)] group-hover:text-[var(--green)]">
                                i
                              </span>
                              <span className="pointer-events-none invisible absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-[240px] -translate-x-1/2 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-2.5 text-[11.5px] font-normal leading-snug text-[var(--text-mid)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-6 after:border-transparent after:border-t-white group-hover:visible">
                                {q.tip}
                              </span>
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`shrink-0 rounded-[var(--radius-pill)] px-3.5 py-1 text-[11px] font-semibold ${ratingBadgeClass(q.rating)}`}
                        >
                          {q.rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
                <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#EDE7F6]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E35B1" strokeWidth="2" aria-hidden>
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  Voice & authenticity
                </div>
                <p className="mb-3 text-[13.5px] leading-relaxed text-[var(--text-mid)]">{feedback.authenticity.assessment}</p>
                {feedback.authenticity.flags.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {feedback.authenticity.flags.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[var(--text-mid)]">
                        <span className="mt-1.5 size-[7px] shrink-0 rounded-full bg-[#5E35B1]" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {feedback.recommendation ? (
                <div className="mb-3.5 rounded-[var(--radius-lg)] border-[1.5px] border-[#c8dece] bg-[var(--green-pale)] px-6 py-5">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--green-bg)]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                      </svg>
                    </span>
                    Final recommendation
                  </div>
                  <p className="text-[14px] leading-[1.7] text-[var(--text-mid)]">{feedback.recommendation}</p>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3 max-[600px]:flex-col">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-3 font-[family-name:var(--font-dm-sans)] text-[13px] font-semibold text-[var(--green)] transition hover:border-[var(--green)] hover:bg-[var(--green-bg)]"
              onClick={() => downloadReport(feedback, essayPrompt, university)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <path d="M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download report
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-6 py-3 font-[family-name:var(--font-dm-sans)] text-[13px] font-semibold text-[var(--green)] transition hover:border-[var(--green)] hover:bg-[var(--green-bg)]"
              onClick={runAgain}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Review again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
