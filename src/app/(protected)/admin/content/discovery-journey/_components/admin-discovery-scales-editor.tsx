"use client";

import { useState } from "react";
import type { DiscoveryScaleOption, DiscoveryScales, ScaleId } from "@/types/discovery";
import {
  SCALE_IDS,
  SCALE_LABELS,
  emptyScaleOption,
} from "../_lib/admin-discovery-form-factories";
import {
  CollapsibleSection,
  Field,
  ItemCard,
  NumberField,
} from "./admin-discovery-form-primitives";

type AdminDiscoveryScalesEditorProps = {
  value: DiscoveryScales;
  onChange: (value: DiscoveryScales) => void;
};

export function AdminDiscoveryScalesEditor({ value, onChange }: AdminDiscoveryScalesEditorProps) {
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
                  <div className="grid gap-3 md:grid-cols-2">
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
                    <Field
                      label="Label"
                      value={option.label}
                      onChange={(label) =>
                        updateScale(
                          scaleId,
                          options.map((row, itemIndex) =>
                            itemIndex === index ? { ...row, label } : row,
                          ),
                        )
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
