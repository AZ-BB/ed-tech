"use client";

import type { AdminAmbassadorStoryOption } from "../_lib/fetch-admin-student-stories-page";
import type { AdminStudentStoryTableRow } from "../_lib/fetch-admin-student-stories-page";
import type { AdminStudentStoryTopicRow } from "../_lib/fetch-admin-student-story-topics";

export const storyInputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

export const storyLabelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

export const storySelectClassName =
  "w-full cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat px-3 py-2 pr-9 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const LANGUAGE_OPTIONS = [
  { value: "", label: "None" },
  { value: "en", label: "EN" },
  { value: "ar", label: "AR" },
  { value: "mixed", label: "Mixed" },
] as const;

type AdminStudentStoryFormFieldsProps = {
  row?: AdminStudentStoryTableRow | null;
  topics: AdminStudentStoryTopicRow[];
  ambassadors: AdminAmbassadorStoryOption[];
};

export function AdminStudentStoryFormFields({
  row,
  topics,
  ambassadors,
}: AdminStudentStoryFormFieldsProps) {
  const youtubeDefault = row?.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${row.youtubeVideoId}`
    : "";

  return (
    <>
      <div className="mb-4">
        <label htmlFor="story-topic" className={storyLabelClassName}>
          Topic
        </label>
        <select
          id="story-topic"
          name="topic_id"
          required
          defaultValue={row?.topicId ?? ""}
          className={storySelectClassName}
          style={{ backgroundImage: SELECT_CHEVRON }}
        >
          <option value="" disabled>
            Select a topic
          </option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="story-title" className={storyLabelClassName}>
          Title
        </label>
        <input
          id="story-title"
          name="title"
          type="text"
          required
          defaultValue={row?.title ?? ""}
          className={storyInputClassName}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="story-description" className={storyLabelClassName}>
          Description
        </label>
        <textarea
          id="story-description"
          name="description"
          rows={4}
          required
          defaultValue={row?.description ?? ""}
          className={`${storyInputClassName} resize-y`}
        />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="story-youtube" className={storyLabelClassName}>
            YouTube URL
          </label>
          <input
            id="story-youtube"
            name="youtube_url"
            type="url"
            required
            placeholder="https://www.youtube.com/watch?v=..."
            defaultValue={youtubeDefault}
            className={storyInputClassName}
          />
        </div>
        <div>
          <label htmlFor="story-duration" className={storyLabelClassName}>
            Duration label
          </label>
          <input
            id="story-duration"
            name="duration_label"
            type="text"
            placeholder="0:48"
            defaultValue={row?.durationLabel ?? ""}
            className={storyInputClassName}
          />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="story-language" className={storyLabelClassName}>
            Language
          </label>
          <select
            id="story-language"
            name="language"
            defaultValue={row?.language ?? ""}
            className={storySelectClassName}
            style={{ backgroundImage: SELECT_CHEVRON }}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="story-sort-order" className={storyLabelClassName}>
            Sort order
          </label>
          <input
            id="story-sort-order"
            name="sort_order"
            type="number"
            defaultValue={row?.sortOrder ?? 0}
            className={storyInputClassName}
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="story-ambassador" className={storyLabelClassName}>
          Ambassador
        </label>
        <select
          id="story-ambassador"
          name="ambassador_id"
          required
          defaultValue={row?.ambassadorId ?? ""}
          className={storySelectClassName}
          style={{ backgroundImage: SELECT_CHEVRON }}
        >
          <option value="" disabled>
            Select an ambassador
          </option>
          {ambassadors.map((ambassador) => (
            <option key={ambassador.id} value={ambassador.id}>
              {ambassador.name} — {ambassador.universityLabel}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="story-byline-override" className={storyLabelClassName}>
          Byline override
        </label>
        <input
          id="story-byline-override"
          name="byline_meta_override"
          type="text"
          placeholder="Now at LSE · from Amman"
          defaultValue={row?.bylineMetaOverride ?? ""}
          className={storyInputClassName}
        />
        <p className="mt-1 text-[11px] text-[#a0a0a0]">
          Leave blank to auto-generate from ambassador profile.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
          <input
            type="checkbox"
            name="is_lead"
            defaultChecked={row?.isLead ?? false}
            className="h-4 w-4 rounded border-[#e0deda] accent-[#2D6A4F]"
          />
          Featured lead story
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={row?.isActive ?? true}
            className="h-4 w-4 rounded border-[#e0deda] accent-[#2D6A4F]"
          />
          Active (visible to students)
        </label>
      </div>
    </>
  );
}
