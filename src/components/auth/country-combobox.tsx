"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Country } from "@/lib/countries";
import { COUNTRIES } from "@/lib/countries";

const triggerBase =
  "flex w-full cursor-pointer items-center justify-between rounded-xl border-[1.5px] bg-white py-3 pr-10 pl-4 text-left text-sm transition focus:outline-none focus:ring-0";

type CountryComboboxProps = {
  id: string;
  label: string;
  value: Country | null;
  onChange: (c: Country | null) => void;
  placeholder: string;
  error?: string;
};

export function CountryCombobox({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.alpha2.toLowerCase().includes(q),
    );
  }, [search]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return (
    <div className="relative mb-0" ref={wrapRef}>
      <label
        htmlFor={`${id}-trigger`}
        className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
      >
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            triggerBase,
            error
              ? "border-red-500 shadow-[0_0_0_3px_rgba(229,57,53,0.08)]"
              : "border-[var(--border)] focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]",
            value ? "text-[var(--text)]" : "text-[var(--text-hint)]",
          )}
        >
          <span className="min-w-0 truncate">
            {value ? value.name : placeholder}
          </span>
        </button>
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[var(--text-hint)]">
          <ChevronDown className="size-2.5" strokeWidth={1.5} aria-hidden />
        </span>
      </div>
      {error ? (
        <p className="mt-1 text-[11px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {open ? (
        <div className="absolute z-[60] mt-1 flex max-h-56 w-full flex-col overflow-hidden rounded-b-[10px] border border-t-0 border-[var(--green-light)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries..."
            className="w-full border-0 border-b border-[var(--border-light)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[#c0bdb8]"
            autoComplete="off"
            autoFocus
            id={`${id}-search`}
          />
          <ul
            className="max-h-44 overflow-y-auto py-0.5"
            role="listbox"
            aria-label={label}
          >
            {filtered.length === 0 ? (
              <li className="px-3.5 py-2 text-sm text-[var(--text-hint)]">
                No matches
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.alpha2} role="option">
                  <button
                    type="button"
                    className={clsx(
                      "w-full cursor-pointer px-3.5 py-2.5 text-left text-sm transition",
                      value?.alpha2 === c.alpha2
                        ? "bg-[var(--green-bg)] font-semibold text-[var(--green)]"
                        : "text-[var(--text)] hover:bg-[#f0f7f2]",
                    )}
                    onClick={() => {
                      onChange(c);
                      setOpen(false);
                    }}
                  >
                    {c.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
