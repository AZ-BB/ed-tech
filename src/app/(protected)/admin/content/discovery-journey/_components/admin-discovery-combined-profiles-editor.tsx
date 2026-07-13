"use client";

import type { CombinedProfileConfig } from "@/types/discovery";
import { emptyCombinedProfile } from "../_lib/admin-discovery-form-factories";
import { Field, ItemCard, StringListField } from "./admin-discovery-form-primitives";

type AdminDiscoveryCombinedProfilesEditorProps = {
  value: CombinedProfileConfig[];
  onChange: (value: CombinedProfileConfig[]) => void;
};

export function AdminDiscoveryCombinedProfilesEditor({
  value,
  onChange,
}: AdminDiscoveryCombinedProfilesEditorProps) {
  function updateProfile(index: number, patch: Partial<CombinedProfileConfig>) {
    onChange(value.map((profile, i) => (i === index ? { ...profile, ...patch } : profile)));
  }

  function updateTriggerGroup(profileIndex: number, groupIndex: number, categories: string[]) {
    const profile = value[profileIndex];
    if (!profile) return;
    const triggers = profile.triggers.map((group, i) =>
      i === groupIndex ? categories : group,
    );
    updateProfile(profileIndex, { triggers });
  }

  function addTriggerGroup(profileIndex: number) {
    const profile = value[profileIndex];
    if (!profile) return;
    updateProfile(profileIndex, { triggers: [...profile.triggers, []] });
  }

  function removeTriggerGroup(profileIndex: number, groupIndex: number) {
    const profile = value[profileIndex];
    if (!profile) return;
    updateProfile(profileIndex, {
      triggers: profile.triggers.filter((_, i) => i !== groupIndex),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-[#666]">
          Cross-module directions matched when trigger categories appear in student top scores.
        </p>
        <button
          type="button"
          onClick={() => onChange([...value, emptyCombinedProfile(value.length + 1)])}
          className="rounded-[8px] border border-[#2D6A4F] px-3 py-2 text-[12px] font-semibold text-[#2D6A4F]"
        >
          + Add profile
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-[12px] text-[#a0a0a0]">No combined profiles yet.</p>
      ) : (
        value.map((profile, profileIndex) => {
          const isFallback = profile.triggers.length === 0;
          return (
            <ItemCard
              key={`${profile.profile_id}-${profileIndex}`}
              index={profileIndex}
              title={
                isFallback
                  ? `${profile.title || profile.profile_id || "Profile"} (default / explorer)`
                  : profile.title || profile.profile_id || `Profile ${profileIndex + 1}`
              }
              onRemove={() => onChange(value.filter((_, i) => i !== profileIndex))}
            >
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Profile ID"
                    value={profile.profile_id}
                    onChange={(profile_id) => updateProfile(profileIndex, { profile_id })}
                  />
                  <Field
                    label="Title"
                    value={profile.title}
                    onChange={(title) => updateProfile(profileIndex, { title })}
                  />
                </div>
                <Field
                  label="Summary"
                  value={profile.summary}
                  multiline
                  rows={3}
                  onChange={(summary) => updateProfile(profileIndex, { summary })}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h5 className="text-[12px] font-semibold text-[#4a4a4a]">Trigger groups</h5>
                    {!isFallback ? (
                      <button
                        type="button"
                        onClick={() => addTriggerGroup(profileIndex)}
                        className="text-[12px] font-semibold text-[#2D6A4F] hover:text-[#1B4332]"
                      >
                        + Add trigger group
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#a0a0a0]">
                        Fallback profile — no triggers
                      </span>
                    )}
                  </div>

                  {isFallback ? (
                    <p className="text-[12px] text-[#666]">
                      Used when no other combined profile matches. Leave triggers empty.
                    </p>
                  ) : profile.triggers.length === 0 ? (
                    <p className="text-[12px] text-[#a0a0a0]">No trigger groups yet.</p>
                  ) : (
                    profile.triggers.map((group, groupIndex) => (
                      <div
                        key={`${profileIndex}-trigger-${groupIndex}`}
                        className="rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[12px] font-semibold text-[#666]">
                            Trigger group {groupIndex + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeTriggerGroup(profileIndex, groupIndex)}
                            className="rounded-[6px] border border-[#fecaca] px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c]"
                          >
                            Remove group
                          </button>
                        </div>
                        <StringListField
                          label="Categories (one per line)"
                          value={group}
                          rows={3}
                          onChange={(categories) =>
                            updateTriggerGroup(profileIndex, groupIndex, categories)
                          }
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ItemCard>
          );
        })
      )}
    </div>
  );
}
