"use client";

import { dismissQuickActionsTour } from "@/actions/student-dashboard";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowForwardIcon } from "./directional-icons";

export type QuickActionTourStep = {
  dictKey: string;
  title: string;
  description: string;
};

type QuickActionsOnboardingTourProps = {
  steps: QuickActionTourStep[];
  labels: {
    skip: string;
    next: string;
    done: string;
    stepOf: string;
  };
  onComplete: () => void;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const HIGHLIGHT_PADDING = 6;
const POPOVER_GAP = 12;
const VIEWPORT_MARGIN = 12;

function getTargetRect(dictKey: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-quick-action="${dictKey}"]`);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  return {
    top: box.top - HIGHLIGHT_PADDING,
    left: box.left - HIGHLIGHT_PADDING,
    width: box.width + HIGHLIGHT_PADDING * 2,
    height: box.height + HIGHLIGHT_PADDING * 2,
  };
}

export function QuickActionsOnboardingTour({
  steps,
  labels,
  onComplete,
}: QuickActionsOnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const [dismissing, setDismissing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex >= steps.length - 1;

  const updatePositions = useCallback(() => {
    if (!currentStep) return;
    const rect = getTargetRect(currentStep.dictKey);
    setTargetRect(rect);
    if (!rect) return;

    const popoverEl = popoverRef.current;
    const popoverWidth = popoverEl?.offsetWidth ?? 320;
    const popoverHeight = popoverEl?.offsetHeight ?? 180;

    const spaceBelow = window.innerHeight - (rect.top + rect.height + POPOVER_GAP);
    const placeBelow = spaceBelow >= popoverHeight + VIEWPORT_MARGIN;

    let top = placeBelow
      ? rect.top + rect.height + POPOVER_GAP
      : rect.top - popoverHeight - POPOVER_GAP;

    let left = rect.left;
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, window.innerWidth - popoverWidth - VIEWPORT_MARGIN),
    );
    top = Math.max(
      VIEWPORT_MARGIN,
      Math.min(top, window.innerHeight - popoverHeight - VIEWPORT_MARGIN),
    );

    setPopoverStyle({ top, left, width: Math.min(popoverWidth, window.innerWidth - VIEWPORT_MARGIN * 2) });
  }, [currentStep]);

  useEffect(() => {
    if (!currentStep) return;
    const target = document.querySelector<HTMLElement>(
      `[data-quick-action="${currentStep.dictKey}"]`,
    );
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    const frame = window.requestAnimationFrame(updatePositions);
    return () => window.cancelAnimationFrame(frame);
  }, [currentStep, stepIndex, updatePositions]);

  useEffect(() => {
    updatePositions();

    const onLayoutChange = () => updatePositions();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onLayoutChange) : null;
    if (currentStep) {
      const target = document.querySelector(`[data-quick-action="${currentStep.dictKey}"]`);
      if (target) ro?.observe(target);
    }

    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
      ro?.disconnect();
    };
  }, [currentStep, updatePositions]);

  useEffect(() => {
    nextButtonRef.current?.focus();
  }, [stepIndex]);

  const finishTour = useCallback(async () => {
    if (dismissing) return;
    setDismissing(true);
    try {
      await dismissQuickActionsTour();
    } finally {
      onComplete();
    }
  }, [dismissing, onComplete]);

  const handleNext = () => {
    if (isLastStep) {
      void finishTour();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  if (!currentStep) return null;

  const stepLabel = labels.stepOf
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(steps.length));

  return (
    <div className="pointer-events-none fixed inset-0 z-[400]" aria-hidden={false}>
      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-[var(--green)]"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgba(26, 26, 26, 0.55)",
            zIndex: 401,
          }}
        />
      ) : null}

      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-actions-tour-title"
        aria-describedby="quick-actions-tour-desc"
        className="pointer-events-auto fixed z-[402] w-[min(320px,calc(100vw-24px))] rounded-2xl border border-[var(--border-light)] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        style={popoverStyle}
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-hint)]">
          {stepLabel}
        </p>
        <h3
          id="quick-actions-tour-title"
          className="font-[family-name:var(--font-dm-serif)] text-lg text-[var(--text)]"
        >
          {currentStep.title}
        </h3>
        <p
          id="quick-actions-tour-desc"
          className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-light)]"
        >
          {currentStep.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-full px-3 py-2 text-[13px] font-medium text-[var(--text-light)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--text-mid)]"
            onClick={() => void finishTour()}
            disabled={dismissing}
          >
            {labels.skip}
          </button>
          <button
            ref={nextButtonRef}
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--green)] px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            onClick={handleNext}
            disabled={dismissing}
          >
            {isLastStep ? labels.done : labels.next}
            {!isLastStep ? <ArrowForwardIcon size={14} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
