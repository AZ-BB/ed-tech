import { PLATFORM_FEATURE_UNAVAILABLE_MESSAGE } from "@/lib/platform-settings";

type StudentFeatureUnavailableProps = {
  featureLabel?: string;
};

export function StudentFeatureUnavailable({ featureLabel }: StudentFeatureUnavailableProps) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md rounded-[12px] border border-[#e8e6e2] bg-white px-8 py-10 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <p className="text-[16px] font-semibold text-[#1a1a1a]">
          {PLATFORM_FEATURE_UNAVAILABLE_MESSAGE}
        </p>
        {featureLabel ? (
          <p className="mt-2 text-[13px] text-[#666]">
            {featureLabel} is temporarily disabled. Please check back later or contact your school
            counselor for assistance.
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-[#666]">
            Please check back later or contact your school counselor for assistance.
          </p>
        )}
      </div>
    </div>
  );
}
