"use client";

import {
  STUDENT_FEATURE_KEYS,
  STUDENT_FEATURE_LABELS,
  type StudentFeatureAccess,
  type StudentFeatureKey,
  defaultStudentFeatureAccess,
} from "@/lib/student-feature-access";

const checkboxRowClass =
  "flex items-center gap-2.5 rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] px-3 py-2.5";

type StudentFeatureAccessFieldsProps = {
  /** Defaults when uncontrolled (e.g. create form). */
  defaults?: StudentFeatureAccess;
  disabled?: boolean;
};

export function StudentFeatureAccessFields({
  defaults = defaultStudentFeatureAccess(true),
  disabled = false,
}: StudentFeatureAccessFieldsProps) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]">
        Feature access
      </legend>
      <p className="mb-2 text-[12px] leading-snug text-[#888]">
        Unchecked features are disabled in the student Quick Actions and navbar.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STUDENT_FEATURE_KEYS.map((key: StudentFeatureKey) => (
          <label key={key} className={`${checkboxRowClass} cursor-pointer`}>
            <input
              type="checkbox"
              name={`feature_${key}`}
              value="on"
              defaultChecked={defaults[key]}
              className="h-4 w-4 shrink-0 accent-[#2D6A4F]"
            />
            <span className="text-[13px] font-medium text-[#1a1a1a]">
              {STUDENT_FEATURE_LABELS[key]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
