"use client";

import type { ReactNode } from "react";

export const discoveryInputClass =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";
export const discoveryLabelClass = "mb-1 block text-[12px] font-semibold text-[#4a4a4a]";
export const discoverySelectClass = discoveryInputClass;

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
};

export function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 2,
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label className={discoveryLabelClass}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={discoveryInputClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={discoveryInputClass}
        />
      )}
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
};

export function NumberField({ label, value, onChange, step = 1, min, max }: NumberFieldProps) {
  return (
    <div>
      <label className={discoveryLabelClass}>{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        className={discoveryInputClass}
      />
    </div>
  );
}

type StringListFieldProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  rows?: number;
  placeholder?: string;
};

export function StringListField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder = "One item per line",
}: StringListFieldProps) {
  return (
    <Field
      label={label}
      value={value.join("\n")}
      multiline
      rows={rows}
      placeholder={placeholder}
      onChange={(text) =>
        onChange(
          text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        )
      }
    />
  );
}

type CategoryFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  categories: string[];
};

export function CategoryField({ label, value, onChange, categories }: CategoryFieldProps) {
  const listId = `category-list-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label className={discoveryLabelClass}>{label}</label>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={discoveryInputClass}
        placeholder="Select or type a category"
      />
      {categories.length > 0 ? (
        <datalist id={listId}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

type CollapsibleSectionProps = {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  onAdd,
  addLabel = "+ Add item",
  children,
}: CollapsibleSectionProps) {
  return (
    <section className="rounded-[10px] border border-[#ece9e4] bg-[#faf9f7]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-[13px] text-[#a0a0a0]">{open ? "▾" : "▸"}</span>
          <span className="text-[13px] font-semibold text-[#1a1a1a]">{title}</span>
          <span className="text-[11px] text-[#a0a0a0]">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </button>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 text-[12px] font-semibold text-[#2D6A4F] hover:text-[#1B4332]"
          >
            {addLabel}
          </button>
        ) : null}
      </div>
      {open ? <div className="space-y-3 border-t border-[#ece9e4] px-4 py-3">{children}</div> : null}
    </section>
  );
}

type ItemCardProps = {
  index: number;
  title?: string;
  onRemove: () => void;
  children: ReactNode;
};

export function ItemCard({ index, title, onRemove, children }: ItemCardProps) {
  return (
    <div className="rounded-[8px] border border-[#e0deda] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[#666]">
          {title ?? `Item ${index + 1}`}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-[6px] border border-[#fecaca] px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c]"
        >
          Remove
        </button>
      </div>
      {children}
    </div>
  );
}

type SaveButtonProps = {
  label?: string;
  pendingLabel?: string;
  disabled?: boolean;
  onClick: () => void;
};

export function SaveButton({
  label = "Save",
  pendingLabel = "Saving…",
  disabled = false,
  onClick,
}: SaveButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
    >
      {disabled ? pendingLabel : label}
    </button>
  );
}
