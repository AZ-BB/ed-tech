"use client";

import { useEffect, useState } from "react";

import { getUniversityMajors } from "@/actions/student-my-application-universities";

import type { ActivityCatalogUniversity } from "../_lib/my-applications-types";
import { ModalVeil } from "./modal-veil";

type Step = "confirm" | "major";

export function MoveToShortlistModal({
  university,
  onClose,
  onConfirm,
}: {
  university: ActivityCatalogUniversity;
  onClose: () => void;
  onConfirm: (majorProgram: string) => void | Promise<void>;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [majors, setMajors] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStep("confirm");
    setMajors([]);
    setSelected("");
    setOtherText("");
    setLoading(true);

    let stale = false;
    getUniversityMajors(university.uniId)
      .then((res) => {
        if (!stale) setMajors(res.data ?? []);
      })
      .catch(() => {
        if (!stale) setMajors([]);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => { stale = true; };
  }, [university.uniId]);

  async function handleConfirm() {
    const value = selected === "__other__" ? otherText.trim() : selected;
    if (!value) return;
    setSubmitting(true);
    try {
      await onConfirm(value);
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    step === "confirm" ? "Shortlist university" : "Select a major";

  return (
    <ModalVeil title={title} onClose={onClose}>
      {step === "confirm" && (
        <div className="flex flex-col gap-5">
          <p className="text-[13.5px] leading-relaxed text-[var(--text)]">
            Do you want to shortlist{" "}
            <strong className="font-semibold">{university.name}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-[8px] border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
              onClick={onClose}
            >
              No
            </button>
            <button
              type="button"
              className="rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
              onClick={() => setStep("major")}
            >
              Yes
            </button>
          </div>
        </div>
      )}

      {step === "major" && loading && (
        <p className="text-sm text-[var(--text-mid)]">Loading majors…</p>
      )}

      {step === "major" && !loading && (
        <div className="flex flex-col gap-4">
          <p className="text-[13.5px] leading-relaxed text-[var(--text)]">
            What major do you consider for{" "}
            <strong className="font-semibold">{university.name}</strong>?
          </p>

          {majors.length > 0 && (
            <div className="flex max-h-[240px] flex-col gap-1.5 overflow-y-auto">
              {majors.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[8px] border px-3 py-2 text-[13px] transition-colors ${
                    selected === m.name
                      ? "border-[var(--green)] bg-[var(--green-pale)] text-[var(--green-dark)]"
                      : "border-[var(--border-light)] bg-white text-[var(--text)] hover:border-[var(--green-light)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="shortlist-major"
                    className="accent-[var(--green)]"
                    checked={selected === m.name}
                    onChange={() => setSelected(m.name)}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          )}

          <label
            className={`flex cursor-pointer items-center gap-2.5 rounded-[8px] border px-3 py-2 text-[13px] transition-colors ${
              selected === "__other__"
                ? "border-[var(--green)] bg-[var(--green-pale)] text-[var(--green-dark)]"
                : "border-[var(--border-light)] bg-white text-[var(--text)] hover:border-[var(--green-light)]"
            }`}
          >
            <input
              type="radio"
              name="shortlist-major"
              className="accent-[var(--green)]"
              checked={selected === "__other__"}
              onChange={() => setSelected("__other__")}
            />
            Other
          </label>

          {selected === "__other__" && (
            <input
              className="rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)]"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Enter your major…"
              autoFocus
            />
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--border-light)] pt-3.5">
            <button
              type="button"
              className="rounded-[8px] border border-[var(--border)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
              onClick={() => {
                setStep("confirm");
                setSelected("");
                setOtherText("");
              }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={
                submitting ||
                !selected ||
                (selected === "__other__" && !otherText.trim())
              }
              className="rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)] disabled:opacity-50"
              onClick={() => void handleConfirm()}
            >
              {submitting ? "Adding…" : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </ModalVeil>
  );
}
