"use client";

import { useState } from "react";

import type { AdminAdvisorOption } from "../_lib/fetch-admin-webinars-page";
import type { AdminWebinarTableRow } from "../_lib/fetch-admin-webinars-page";

export const webinarInputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

export const webinarLabelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

export const webinarSelectClassName =
  "w-full cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat px-3 py-2 pr-9 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const WEBINAR_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function toLocalDateValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function todayLocalDateValue(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isScheduledAtInFuture(iso: string | undefined): boolean {
  if (!iso) return true;
  const scheduledMs = new Date(iso).getTime();
  return !Number.isNaN(scheduledMs) && scheduledMs > Date.now();
}

type AdminWebinarFormFieldsProps = {
  row?: AdminWebinarTableRow | null;
  advisors: AdminAdvisorOption[];
  agendaItems: string[];
  onAgendaChange: (items: string[]) => void;
};

export function AdminWebinarFormFields({
  row,
  advisors,
  agendaItems,
  onAgendaChange,
}: AdminWebinarFormFieldsProps) {
  const minDate = !row || isScheduledAtInFuture(row.scheduledAt) ? todayLocalDateValue() : undefined;
  const [hostMode, setHostMode] = useState<"advisor" | "custom">(
    row?.hostName ? "custom" : "advisor",
  );
  const [removeHostImage, setRemoveHostImage] = useState(false);

  function addAgendaItem() {
    onAgendaChange([...agendaItems, ""]);
  }

  function updateAgendaItem(index: number, value: string) {
    const next = [...agendaItems];
    next[index] = value;
    onAgendaChange(next);
  }

  function removeAgendaItem(index: number) {
    onAgendaChange(agendaItems.filter((_, i) => i !== index));
  }

  return (
    <>
      <div className="mb-4">
        <label htmlFor="webinar-title" className={webinarLabelClassName}>
          Title
        </label>
        <input
          id="webinar-title"
          name="title"
          type="text"
          required
          defaultValue={row?.title ?? ""}
          className={webinarInputClassName}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="webinar-description" className={webinarLabelClassName}>
          Description
        </label>
        <textarea
          id="webinar-description"
          name="description"
          rows={4}
          defaultValue={row?.description ?? ""}
          className={`${webinarInputClassName} resize-y`}
        />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="webinar-date" className={webinarLabelClassName}>
            Date
          </label>
          <input
            id="webinar-date"
            name="scheduled_date"
            type="date"
            required
            min={minDate}
            defaultValue={toLocalDateValue(row?.scheduledAt)}
            className={webinarInputClassName}
          />
        </div>
        <div>
          <label htmlFor="webinar-time" className={webinarLabelClassName}>
            Time
          </label>
          <input
            id="webinar-time"
            name="scheduled_time"
            type="time"
            required
            defaultValue={toLocalTimeValue(row?.scheduledAt)}
            className={webinarInputClassName}
          />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="webinar-timezone" className={webinarLabelClassName}>
            Timezone label
          </label>
          <input
            id="webinar-timezone"
            name="timezone_label"
            type="text"
            defaultValue={row?.timezoneLabel ?? "GST"}
            className={webinarInputClassName}
          />
        </div>
        <div>
          <label htmlFor="webinar-format" className={webinarLabelClassName}>
            Format
          </label>
          <input
            id="webinar-format"
            name="format"
            type="text"
            defaultValue={row?.format ?? "Live online webinar"}
            className={webinarInputClassName}
          />
        </div>
      </div>

      <div className="mb-4">
        <span className={webinarLabelClassName}>Host</span>
        <div className="mb-3 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border border-[#e0deda] px-3 py-2 text-[12px] font-semibold text-[#4a4a4a] has-checked:border-[#2D6A4F] has-checked:bg-[#f0f7f2] has-checked:text-[#2D6A4F]">
            <input
              type="radio"
              name="host_mode"
              value="advisor"
              checked={hostMode === "advisor"}
              onChange={() => setHostMode("advisor")}
              className="accent-[#2D6A4F]"
            />
            Existing advisor
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border border-[#e0deda] px-3 py-2 text-[12px] font-semibold text-[#4a4a4a] has-checked:border-[#2D6A4F] has-checked:bg-[#f0f7f2] has-checked:text-[#2D6A4F]">
            <input
              type="radio"
              name="host_mode"
              value="custom"
              checked={hostMode === "custom"}
              onChange={() => setHostMode("custom")}
              className="accent-[#2D6A4F]"
            />
            Custom host
          </label>
        </div>

        {hostMode === "advisor" ? (
          <div>
            <label htmlFor="webinar-advisor" className={webinarLabelClassName}>
              Advisor
            </label>
            <select
              id="webinar-advisor"
              name="advisor_id"
              defaultValue={row?.advisorId ?? ""}
              className={webinarSelectClassName}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              <option value="">Select advisor</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-[10px] border border-[#ece9e4] bg-[#faf9f7] p-4">
            <div>
              <label htmlFor="webinar-host-name" className={webinarLabelClassName}>
                Host name
              </label>
              <input
                id="webinar-host-name"
                name="host_name"
                type="text"
                defaultValue={row?.hostName ?? ""}
                className={webinarInputClassName}
                placeholder="Sarah Al-Khalifa"
              />
            </div>
            <div>
              <label htmlFor="webinar-host-title" className={webinarLabelClassName}>
                Host title / role
              </label>
              <input
                id="webinar-host-title"
                name="host_title"
                type="text"
                defaultValue={row?.hostTitle ?? ""}
                className={webinarInputClassName}
                placeholder="UK Admissions Advisor"
              />
            </div>
            <div>
              <label htmlFor="webinar-host-bio" className={webinarLabelClassName}>
                Host bio
              </label>
              <textarea
                id="webinar-host-bio"
                name="host_bio"
                rows={3}
                defaultValue={row?.hostBio ?? ""}
                className={`${webinarInputClassName} resize-y`}
                placeholder="Short bio shown on the student webinars page"
              />
            </div>
            <div>
              <label htmlFor="webinar-host-image" className={webinarLabelClassName}>
                Host photo <span className="font-normal text-[#a0a0a0]">(optional)</span>
              </label>
              {row?.hostImageUrl && !removeHostImage ? (
                <div className="mb-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.hostImageUrl}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setRemoveHostImage(true)}
                    className="cursor-pointer text-[12px] font-semibold text-[#b91c1c]"
                  >
                    Remove photo
                  </button>
                </div>
              ) : null}
              <input
                id="webinar-host-image"
                name="host_image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="block w-full text-[12px] text-[#4a4a4a] file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#f0f7f2] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#2D6A4F]"
              />
              {row?.hostImageUrl ? (
                <input
                  type="hidden"
                  name="existing_host_image_url"
                  value={removeHostImage ? "" : row.hostImageUrl}
                />
              ) : null}
              <input type="hidden" name="remove_host_image" value={removeHostImage ? "1" : "0"} />
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="webinar-max-students" className={webinarLabelClassName}>
          Max students
        </label>
        <input
          id="webinar-max-students"
          name="max_students"
          type="number"
          min={1}
          required
          defaultValue={row?.maxStudents ?? 200}
          className={webinarInputClassName}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="webinar-tags" className={webinarLabelClassName}>
          Tags (comma-separated)
        </label>
        <input
          id="webinar-tags"
          name="tags"
          type="text"
          defaultValue={row?.tags?.join(", ") ?? ""}
          className={webinarInputClassName}
          placeholder="UK Applications, UCAS, Personal Statement"
        />
      </div>

      <div className="mb-4">
        <div className="mb--2 flex items-center justify-between">
          <span className={webinarLabelClassName}>Agenda items</span>
          <button
            type="button"
            onClick={addAgendaItem}
            className="cursor-pointer text-[12px] font-semibold text-[#2D6A4F] hover:text-[#1B4332]"
          >
            + Add item
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {agendaItems.length === 0 ? (
            <p className="text-[12px] text-[#a0a0a0]">No agenda items yet.</p>
          ) : (
            agendaItems.map((item, index) => (
              <div key={`agenda-${index}`} className="flex gap-2">
                <input
                  name="agenda_items"
                  type="text"
                  value={item}
                  onChange={(event) => updateAgendaItem(index, event.target.value)}
                  className={webinarInputClassName}
                  placeholder="What will be covered"
                />
                <button
                  type="button"
                  onClick={() => removeAgendaItem(index)}
                  className="shrink-0 cursor-pointer rounded-[8px] border border-[#fecaca] px-3 text-[12px] font-semibold text-[#b91c1c]"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="webinar-meeting-link" className={webinarLabelClassName}>
          Meeting link <span className="font-normal text-[#a0a0a0]">(optional)</span>
        </label>
        <input
          id="webinar-meeting-link"
          name="meeting_link"
          type="url"
          defaultValue={row?.meetingLink ?? ""}
          className={webinarInputClassName}
          placeholder="https://meet.google.com/..."
        />
      </div>

      <div className="mb-5">
        <label htmlFor="webinar-status" className={webinarLabelClassName}>
          Status
        </label>
        <select
          id="webinar-status"
          name="status"
          required
          defaultValue={row?.status ?? "upcoming"}
          className={webinarSelectClassName}
          style={{ backgroundImage: SELECT_CHEVRON }}
        >
          {WEBINAR_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
