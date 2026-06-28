"use client";

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

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="webinar-advisor" className={webinarLabelClassName}>
            Advisor
          </label>
          <select
            id="webinar-advisor"
            name="advisor_id"
            required
            defaultValue={row?.advisorId ?? ""}
            className={webinarSelectClassName}
            style={{ backgroundImage: SELECT_CHEVRON }}
          >
            <option value="" disabled>
              Select advisor
            </option>
            {advisors.map((advisor) => (
              <option key={advisor.id} value={advisor.id}>
                {advisor.name}
              </option>
            ))}
          </select>
        </div>
        <div>
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
