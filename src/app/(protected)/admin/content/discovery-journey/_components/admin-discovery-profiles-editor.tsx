"use client";

import type { DiscoveryModuleProfile } from "@/types/discovery";
import { emptyModuleProfile } from "../_lib/admin-discovery-form-factories";
import { Field, ItemCard, StringListField } from "./admin-discovery-form-primitives";

type AdminDiscoveryProfilesEditorProps = {
  profiles: DiscoveryModuleProfile[];
  categories: string[];
  onChange: (profiles: DiscoveryModuleProfile[]) => void;
};

export function AdminDiscoveryProfilesEditor({
  profiles,
  categories,
  onChange,
}: AdminDiscoveryProfilesEditorProps) {
  function updateProfile(index: number, patch: Partial<DiscoveryModuleProfile>) {
    onChange(profiles.map((profile, i) => (i === index ? { ...profile, ...patch } : profile)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[13px] font-semibold text-[#1a1a1a]">Module profiles</h4>
        <button
          type="button"
          onClick={() => onChange([...profiles, emptyModuleProfile(profiles.length + 1)])}
          className="text-[12px] font-semibold text-[#2D6A4F] hover:text-[#1B4332]"
        >
          + Add profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <p className="text-[12px] text-[#a0a0a0]">No profiles yet.</p>
      ) : (
        profiles.map((profile, index) => (
          <ItemCard
            key={`${profile.profile_id}-${index}`}
            index={index}
            title={profile.title || profile.profile_id || `Profile ${index + 1}`}
            onRemove={() => onChange(profiles.filter((_, i) => i !== index))}
          >
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Profile ID"
                  value={profile.profile_id}
                  onChange={(profile_id) => updateProfile(index, { profile_id })}
                />
                <Field
                  label="Title"
                  value={profile.title}
                  onChange={(title) => updateProfile(index, { title })}
                />
              </div>
              <StringListField
                label="Matching categories"
                value={profile.matching_categories}
                rows={3}
                onChange={(matching_categories) => updateProfile(index, { matching_categories })}
                placeholder={
                  categories.length > 0
                    ? `Module categories:\n${categories.slice(0, 3).join("\n")}…`
                    : "One category per line"
                }
              />
              <StringListField
                label="Majors (strong fit)"
                value={profile.majors_strong}
                rows={3}
                onChange={(majors_strong) => updateProfile(index, { majors_strong })}
              />
              <StringListField
                label="Majors (related)"
                value={profile.majors_related}
                rows={3}
                onChange={(majors_related) => updateProfile(index, { majors_related })}
              />
              <StringListField
                label="Majors (stretch)"
                value={profile.majors_stretch}
                rows={3}
                onChange={(majors_stretch) => updateProfile(index, { majors_stretch })}
              />
              <StringListField
                label="Careers"
                value={profile.careers}
                rows={4}
                onChange={(careers) => updateProfile(index, { careers })}
              />
            </div>
          </ItemCard>
        ))
      )}
    </div>
  );
}
