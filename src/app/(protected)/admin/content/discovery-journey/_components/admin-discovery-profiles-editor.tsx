"use client";

import type { DiscoveryModuleProfile } from "@/types/discovery";
import type { DiscoveryModuleContentAr } from "@/lib/discovery-translatable-fields";
import { emptyModuleProfile } from "../_lib/admin-discovery-form-factories";
import {
  getProfileListAr,
  getProfileTitleAr,
  setProfileListAr,
  setProfileTitleAr,
} from "../_lib/admin-discovery-content-ar-helpers";
import {
  BilingualField,
  BilingualStringListField,
  Field,
  ItemCard,
  StringListField,
} from "./admin-discovery-form-primitives";

type AdminDiscoveryProfilesEditorProps = {
  profiles: DiscoveryModuleProfile[];
  categories: string[];
  contentAr: DiscoveryModuleContentAr;
  onChange: (profiles: DiscoveryModuleProfile[]) => void;
  onContentArChange: (contentAr: DiscoveryModuleContentAr) => void;
};

export function AdminDiscoveryProfilesEditor({
  profiles,
  categories,
  contentAr,
  onChange,
  onContentArChange,
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
        profiles.map((profile, index) => {
          const profileId = profile.profile_id;
          return (
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
                    onChange={(nextProfileId) => updateProfile(index, { profile_id: nextProfileId })}
                  />
                </div>
                <BilingualField
                  label="Title"
                  enValue={profile.title}
                  arValue={getProfileTitleAr(contentAr, profileId)}
                  onEnChange={(title) => updateProfile(index, { title })}
                  onArChange={(title) =>
                    onContentArChange(setProfileTitleAr(contentAr, profileId, title))
                  }
                />
                <StringListField
                  label="Matching categories (EN only — scoring keys)"
                  value={profile.matching_categories}
                  rows={3}
                  onChange={(matching_categories) => updateProfile(index, { matching_categories })}
                  placeholder={
                    categories.length > 0
                      ? `Module categories:\n${categories.slice(0, 3).join("\n")}…`
                      : "One category per line"
                  }
                />
                <BilingualStringListField
                  label="Majors (strong fit)"
                  enValue={profile.majors_strong}
                  arValue={getProfileListAr(contentAr, profileId, "majors_strong")}
                  rows={3}
                  onEnChange={(majors_strong) => updateProfile(index, { majors_strong })}
                  onArChange={(majors_strong) =>
                    onContentArChange(
                      setProfileListAr(contentAr, profileId, "majors_strong", majors_strong),
                    )
                  }
                />
                <BilingualStringListField
                  label="Majors (related)"
                  enValue={profile.majors_related}
                  arValue={getProfileListAr(contentAr, profileId, "majors_related")}
                  rows={3}
                  onEnChange={(majors_related) => updateProfile(index, { majors_related })}
                  onArChange={(majors_related) =>
                    onContentArChange(
                      setProfileListAr(contentAr, profileId, "majors_related", majors_related),
                    )
                  }
                />
                <BilingualStringListField
                  label="Majors (stretch)"
                  enValue={profile.majors_stretch}
                  arValue={getProfileListAr(contentAr, profileId, "majors_stretch")}
                  rows={3}
                  onEnChange={(majors_stretch) => updateProfile(index, { majors_stretch })}
                  onArChange={(majors_stretch) =>
                    onContentArChange(
                      setProfileListAr(contentAr, profileId, "majors_stretch", majors_stretch),
                    )
                  }
                />
                <BilingualStringListField
                  label="Careers"
                  enValue={profile.careers}
                  arValue={getProfileListAr(contentAr, profileId, "careers")}
                  rows={4}
                  onEnChange={(careers) => updateProfile(index, { careers })}
                  onArChange={(careers) =>
                    onContentArChange(setProfileListAr(contentAr, profileId, "careers", careers))
                  }
                />
              </div>
            </ItemCard>
          );
        })
      )}
    </div>
  );
}
