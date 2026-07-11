"use client";

import {
  POST_ADMISSION_SERVICE_KEYS,
  type PostAdmissionServiceKey,
} from "@/lib/post-admission-services";
import { useLocale } from "@/lib/i18n/locale-context";
import { useEffect, useState } from "react";

type PostAdmissionServiceSelectionDialogProps = {
  open: boolean;
  preselectedServiceKey?: PostAdmissionServiceKey;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (input: {
    selectedService: PostAdmissionServiceKey;
    serviceOtherDetail?: string;
  }) => void;
};

const SERVICE_KEYS_WITHOUT_OTHER = POST_ADMISSION_SERVICE_KEYS.filter(
  (key) => key !== "other",
);

export function PostAdmissionServiceSelectionDialog({
  open,
  preselectedServiceKey,
  isPending,
  onClose,
  onConfirm,
}: PostAdmissionServiceSelectionDialogProps) {
  const { dict } = useLocale();
  const t = dict.student.postAdmission;
  const ss = t.serviceSelection;

  const [selectedService, setSelectedService] = useState<PostAdmissionServiceKey | "">(
    preselectedServiceKey ?? "",
  );
  const [otherDetail, setOtherDetail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedService(preselectedServiceKey ?? "");
    setOtherDetail("");
    setError(null);
  }, [open, preselectedServiceKey]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isPending, onClose, open]);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!selectedService) {
      setError(ss.errors.serviceRequired);
      return;
    }

    const trimmedOther = otherDetail.trim();
    if (selectedService === "other" && !trimmedOther) {
      setError(ss.errors.otherRequired);
      return;
    }

    onConfirm({
      selectedService,
      serviceOtherDetail: selectedService === "other" ? trimmedOther : undefined,
    });
  }

  const selectChevron =
    "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")";

  return (
    <div
      className="pas-calendly-modal-overlay"
      onClick={isPending ? undefined : onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pas-service-selection-title"
        className="pas-calendly-modal pas-service-selection-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pas-calendly-modal-header">
          <h2 id="pas-service-selection-title" className="pas-calendly-modal-title">
            {ss.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="pas-calendly-modal-close"
            aria-label={ss.closeAria}
            disabled={isPending}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="pas-service-selection-body" onSubmit={handleSubmit}>
          <p className="pas-service-selection-subtitle">{ss.subtitle}</p>

          <label className="pas-service-selection-field">
            <span className="pas-service-selection-label">{ss.serviceLabel}</span>
            <select
              className="pas-service-selection-select"
              style={{ backgroundImage: selectChevron }}
              value={selectedService}
              disabled={isPending}
              onChange={(event) => {
                setSelectedService(event.target.value as PostAdmissionServiceKey | "");
                setError(null);
              }}
            >
              <option value="">{ss.servicePlaceholder}</option>
              {SERVICE_KEYS_WITHOUT_OTHER.map((key) => (
                <option key={key} value={key}>
                  {t.services[key].title}
                </option>
              ))}
              <option value="other">{ss.otherOption}</option>
            </select>
          </label>

          {selectedService === "other" ? (
            <label className="pas-service-selection-field">
              <span className="pas-service-selection-label">{ss.otherLabel}</span>
              <textarea
                className="pas-service-selection-textarea"
                placeholder={ss.otherPlaceholder}
                value={otherDetail}
                disabled={isPending}
                rows={4}
                onChange={(event) => {
                  setOtherDetail(event.target.value);
                  setError(null);
                }}
              />
            </label>
          ) : null}

          {error ? (
            <p className="pas-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="pas-service-selection-actions">
            <button
              type="button"
              className="pas-service-selection-cancel"
              onClick={onClose}
              disabled={isPending}
            >
              {ss.cancel}
            </button>
            <button
              type="submit"
              className="pas-service-selection-submit"
              disabled={isPending}
            >
              {isPending ? ss.continuing : ss.continue}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
