"use client";

import { useState } from "react";
import type { DiscoveryScaleOption, DiscoveryScales, ScaleId } from "@/types/discovery";
import type { DiscoverySettingsContentAr } from "@/lib/discovery-translatable-fields";
import {
  SCALE_IDS,
  SCALE_LABELS,
  emptyScaleOption,
} from "../_lib/admin-discovery-form-factories";
import { getScaleLabelAr, setScaleLabelAr } from "../_lib/admin-discovery-content-ar-helpers";
import {
  BilingualField,
  CollapsibleSection,
  ItemCard,
  NumberField,
} from "./admin-discovery-form-primitives";

type AdminDiscoveryScalesEditorProps = {
  value: DiscoveryScales;
  contentAr: DiscoverySettingsContentAr;
  onChange: (value: DiscoveryScales) => void;
  onContentArChange: (contentAr: DiscoverySettingsContentAr) => void;
};

export function AdminDiscoveryScalesEditor({
  value,
  contentAr,
  onChange,
  onContentArChange,
}: AdminDiscoveryScalesEditorProps) {
  const [openScale, setOpenScale] = useState<ScaleId | null>("interest");

  function updateScale(scaleId: ScaleId, options: DiscoveryScaleOption[]) {
    onChange({ ...value, [scaleId]: options });
  }

  function addScale(scaleId: ScaleId) {
    const current = value[scaleId] ?? [];
    const nextValue =
      current.length > 0 ? Math.max(...current.map((o) => o.value)) + 1 : 1;
    updateScale(scaleId, [...current, emptyScaleOption(nextValue)]);
    setOpenScale(scaleId);
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#666]">
        Label text shown for each answer option on rating and forced-choice modules.
      </p>

      {SCALE_IDS.map((scaleId) => {
        const options = value[scaleId] ?? [];
        return (
          <CollapsibleSection
            key={scaleId}
            title={SCALE_LABELS[scaleId]}
            count={options.length}
            open={openScale === scaleId}
            onToggle={() => setOpenScale((current) => (current === scaleId ? null : scaleId))}
            onAdd={() => addScale(scaleId)}
            addLabel="+ Add option"
          >
            {options.length === 0 ? (
              <p className="text-[12px] text-[#a0a0a0]">No options yet.</p>
            ) : (
              options.map((option, index) => (
                <ItemCard
                  key={`${scaleId}-${index}`}
                  index={index}
                  title={`${SCALE_LABELS[scaleId]} · value ${option.value}`}
                  onRemove={() =>
                    updateScale(
                      scaleId,
                      options.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                    <NumberField
                      label="Value"
                      value={option.value}
                      min={1}
                      onChange={(nextValue) =>
                        updateScale(
                          scaleId,
                          options.map((row, itemIndex) =>
                            itemIndex === index ? { ...row, value: nextValue } : row,
                          ),
                        )
                      }
                    />
                    <BilingualField
                      label="Label"
                      enValue={option.label}
                      arValue={getScaleLabelAr(contentAr, scaleId, option.value)}
                      onEnChange={(label) =>
                        updateScale(
                          scaleId,
                          options.map((row, itemIndex) =>
                            itemIndex === index ? { ...row, label } : row,
                          ),
                        )
                      }
                      onArChange={(label) =>
                        onContentArChange(setScaleLabelAr(contentAr, scaleId, option.value, label))
                      }
                    />
                  </div>
                </ItemCard>
              ))
            )}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
