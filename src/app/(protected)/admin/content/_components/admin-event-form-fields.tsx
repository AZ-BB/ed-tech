import type { AdminEventDetail } from "../_lib/fetch-admin-event-detail";

type FieldDef = {
  name: keyof AdminEventDetail | "featured_checkbox";
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "checkbox" | "select";
  options?: string[];
  rows?: number;
  required?: boolean;
};

const FIELD_GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Identity",
    fields: [
      { name: "event_id", label: "Event ID", required: true },
      { name: "event_name", label: "Event name", required: true },
      { name: "event_type", label: "Event type", required: true },
      { name: "featured_checkbox", label: "Featured", type: "checkbox" },
      { name: "recommended_tag", label: "Recommended tag" },
    ],
  },
  {
    title: "Schedule",
    fields: [
      { name: "date_start", label: "Date start", type: "date" },
      { name: "date_end", label: "Date end", type: "date" },
      { name: "month", label: "Month" },
      { name: "year", label: "Year", type: "number" },
      { name: "start_time", label: "Start time" },
      { name: "end_time", label: "End time" },
      { name: "timezone", label: "Timezone" },
    ],
  },
  {
    title: "Location",
    fields: [
      { name: "mode", label: "Mode" },
      { name: "country", label: "Country" },
      { name: "city", label: "City" },
      { name: "venue", label: "Venue" },
      { name: "region_focus", label: "Region focus" },
    ],
  },
  {
    title: "Content",
    fields: [
      { name: "short_description", label: "Short description", type: "textarea", rows: 2 },
      { name: "full_overview", label: "Full overview", type: "textarea", rows: 4 },
      {
        name: "topics_covered",
        label: "Topics covered (semicolon-separated)",
        type: "textarea",
        rows: 2,
      },
      {
        name: "target_audience",
        label: "Target audience (semicolon-separated)",
        type: "textarea",
        rows: 2,
      },
      {
        name: "why_attend",
        label: "Why attend (semicolon-separated)",
        type: "textarea",
        rows: 2,
      },
      {
        name: "prep_steps",
        label: "Prep steps (semicolon-separated)",
        type: "textarea",
        rows: 3,
      },
    ],
  },
  {
    title: "Universities",
    fields: [
      {
        name: "universities_attending",
        label: "Universities attending (semicolon-separated)",
        type: "textarea",
        rows: 2,
      },
      { name: "university_count", label: "University count", type: "number" },
    ],
  },
  {
    title: "Organizer & registration",
    fields: [
      { name: "organizer", label: "Organizer" },
      { name: "organizer_type", label: "Organizer type" },
      { name: "cost", label: "Cost" },
      { name: "language", label: "Language" },
      { name: "registration_status", label: "Registration status" },
      { name: "registration_required", label: "Registration required" },
      { name: "registration_url", label: "Registration URL" },
    ],
  },
  {
    title: "Admin & source",
    fields: [
      { name: "source_name", label: "Source name" },
      { name: "source_url", label: "Source URL" },
      { name: "date_verified", label: "Date verified", type: "date" },
      {
        name: "record_status",
        label: "Record status",
        type: "select",
        options: ["Active", "Draft", "Archived", "Example"],
      },
      {
        name: "internal_notes",
        label: "Internal notes (admin only)",
        type: "textarea",
        rows: 3,
      },
    ],
  },
];

function fieldValue(event: Partial<AdminEventDetail> | undefined, field: FieldDef): string {
  if (field.name === "featured_checkbox") {
    return event?.featured ? "on" : "";
  }
  const raw = event?.[field.name as keyof AdminEventDetail];
  if (raw == null) return "";
  if (typeof raw === "boolean") return raw ? "true" : "";
  if (typeof raw === "number") return String(raw);
  if (field.type === "date" && typeof raw === "string") return raw.slice(0, 10);
  return String(raw);
}

const inputClass =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

export function AdminEventFormFields({
  event,
  idPrefix = "",
}: {
  event?: Partial<AdminEventDetail>;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-6">
      {FIELD_GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#a0a0a0]">
            {group.title}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {group.fields.map((field) => {
              const inputId = `${idPrefix}${field.name}`;
              const value = fieldValue(event, field);

              if (field.type === "checkbox") {
                return (
                  <label
                    key={field.name}
                    htmlFor={inputId}
                    className="flex items-center gap-2 text-[13px] text-[#4a4a4a] md:col-span-2"
                  >
                    <input
                      id={inputId}
                      name="featured"
                      type="checkbox"
                      defaultChecked={Boolean(event?.featured)}
                      className="h-4 w-4 rounded border-[#e0deda]"
                    />
                    {field.label}
                  </label>
                );
              }

              if (field.type === "textarea") {
                return (
                  <div
                    key={field.name}
                    className={field.name === "short_description" ? "md:col-span-2" : "md:col-span-2"}
                  >
                    <label htmlFor={inputId} className="mb-1 block text-[12px] font-medium text-[#4a4a4a]">
                      {field.label}
                      {field.required ? " *" : ""}
                    </label>
                    <textarea
                      id={inputId}
                      name={field.name}
                      rows={field.rows ?? 3}
                      defaultValue={value}
                      required={field.required}
                      className={inputClass}
                    />
                  </div>
                );
              }

              if (field.type === "select" && field.options) {
                return (
                  <div key={field.name}>
                    <label htmlFor={inputId} className="mb-1 block text-[12px] font-medium text-[#4a4a4a]">
                      {field.label}
                    </label>
                    <select
                      id={inputId}
                      name={field.name}
                      defaultValue={value || "Active"}
                      className={inputClass}
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={field.name}>
                  <label htmlFor={inputId} className="mb-1 block text-[12px] font-medium text-[#4a4a4a]">
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  <input
                    id={inputId}
                    name={field.name}
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    defaultValue={value}
                    required={field.required}
                    className={inputClass}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
