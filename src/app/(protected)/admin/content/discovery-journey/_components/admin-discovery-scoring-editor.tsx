"use client";

import type { ScoringRulesConfig } from "@/types/discovery";
import { DEFAULT_SCORING_RULES } from "@/types/discovery";
import { NumberField } from "./admin-discovery-form-primitives";

type AdminDiscoveryScoringEditorProps = {
  value: ScoringRulesConfig;
  onChange: (value: ScoringRulesConfig) => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-[#ece9e4] bg-[#faf9f7] p-4">
      <h4 className="mb-3 text-[13px] font-semibold text-[#1a1a1a]">{title}</h4>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function AdminDiscoveryScoringEditor({
  value,
  onChange,
}: AdminDiscoveryScoringEditorProps) {
  function patch(partial: Partial<ScoringRulesConfig>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-[#666]">
          Numeric thresholds used when scoring modules and computing confidence.
        </p>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_SCORING_RULES)}
          className="rounded-[8px] border border-[#e0deda] px-3 py-2 text-[12px] font-semibold text-[#4a4a4a]"
        >
          Reset to defaults
        </button>
      </div>

      <Section title="Rating scale">
        <NumberField
          label="Max value (rating_1_5.maxValue)"
          value={value.rating_1_5.maxValue}
          min={1}
          onChange={(maxValue) => patch({ rating_1_5: { maxValue } })}
        />
      </Section>

      <Section title="Forced choice">
        <NumberField
          label="Questions per pole"
          value={value.forced_choice.questionsPerPole}
          min={1}
          onChange={(questionsPerPole) => patch({ forced_choice: { questionsPerPole } })}
        />
      </Section>

      <Section title="Profile match">
        <NumberField
          label="Top category bonus"
          value={value.profile_match.topCategoryBonus}
          min={0}
          onChange={(topCategoryBonus) => patch({ profile_match: { topCategoryBonus } })}
        />
      </Section>

      <Section title="Confidence">
        <NumberField
          label="Strong signal min gap"
          value={value.confidence.strongMinGap}
          min={0}
          onChange={(strongMinGap) =>
            patch({ confidence: { ...value.confidence, strongMinGap } })
          }
        />
        <NumberField
          label="Emerging signal min gap"
          value={value.confidence.emergingMinGap}
          min={0}
          onChange={(emergingMinGap) =>
            patch({ confidence: { ...value.confidence, emergingMinGap } })
          }
        />
      </Section>

      <Section title="Response flags">
        <NumberField
          label="Straight-lining min ratio"
          value={value.flags.straightLiningMinRatio}
          step={0.01}
          min={0}
          max={1}
          onChange={(straightLiningMinRatio) =>
            patch({ flags: { ...value.flags, straightLiningMinRatio } })
          }
        />
        <NumberField
          label="Neutral-heavy min ratio"
          value={value.flags.neutralHeavyMinRatio}
          step={0.01}
          min={0}
          max={1}
          onChange={(neutralHeavyMinRatio) =>
            patch({ flags: { ...value.flags, neutralHeavyMinRatio } })
          }
        />
        <NumberField
          label="Neutral value"
          value={value.flags.neutralValue}
          min={1}
          onChange={(neutralValue) => patch({ flags: { ...value.flags, neutralValue } })}
        />
        <NumberField
          label="Low variance rating max spread"
          value={value.flags.lowVarianceRatingMaxSpread}
          min={0}
          onChange={(lowVarianceRatingMaxSpread) =>
            patch({ flags: { ...value.flags, lowVarianceRatingMaxSpread } })
          }
        />
        <NumberField
          label="Low variance forced/scenario max spread"
          value={value.flags.lowVarianceForcedScenarioMaxSpread}
          min={0}
          onChange={(lowVarianceForcedScenarioMaxSpread) =>
            patch({ flags: { ...value.flags, lowVarianceForcedScenarioMaxSpread } })
          }
        />
      </Section>
    </div>
  );
}
