"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type CountrySelectOption = {
  id: string;
  name: string;
};

type CountryMultiSelectAutocompleteProps = {
  id: string;
  label: string;
  options: CountrySelectOption[];
  value: string[];
  onChange: (codes: string[]) => void;
  /** Form field name for each selected country (multiple hidden inputs). */
  hiddenInputName?: string;
  placeholder?: string;
  hint?: string;
  inputClassName?: string;
  labelClassName?: string;
};

export function CountryMultiSelectAutocomplete({
  id,
  label,
  options,
  value,
  onChange,
  hiddenInputName = "specializationCountryCodes",
  placeholder = "Search countries by name or code…",
  hint = "Search and press Enter to add. Use Backspace to remove the last country.",
  inputClassName = "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]",
  labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]",
}: CountryMultiSelectAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id.toUpperCase(), option])),
    [options],
  );

  const selectedSet = useMemo(() => new Set(value.map((code) => code.toUpperCase())), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = options.filter((option) => !selectedSet.has(option.id.toUpperCase()));

    if (!q) return available.slice(0, 8);

    return available
      .filter(
        (option) =>
          option.name.toLowerCase().includes(q) || option.id.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [options, query, selectedSet]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, filtered.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addCountry(code: string) {
    const normalized = code.toUpperCase();
    if (selectedSet.has(normalized)) return;
    onChange([...value, normalized]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeCountry(code: string) {
    const normalized = code.toUpperCase();
    onChange(value.filter((item) => item.toUpperCase() !== normalized));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const match = filtered[activeIndex];
      if (match) addCountry(match.id);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }

    if (event.key === "Backspace" && !query && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const listboxId = `${id}-listbox`;

  return (
    <div ref={wrapRef}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>

      {value.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((code) => {
            const option = optionsById.get(code.toUpperCase());
            const labelText = option ? `${option.name} (${option.id})` : code;

            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-[11px] font-semibold text-[#1B4332]"
              >
                {labelText}
                <button
                  type="button"
                  className="rounded-full p-0.5 text-[#1B4332] opacity-70 hover:opacity-100"
                  aria-label={`Remove ${labelText}`}
                  onClick={() => removeCountry(code)}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className={inputClassName}
        />

        {open && filtered.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-[70] mt-1 max-h-52 w-full overflow-y-auto rounded-[8px] border border-[#e0deda] bg-white py-1 shadow-lg"
          >
            {filtered.map((option, index) => (
              <li key={option.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition ${
                    index === activeIndex
                      ? "bg-[#e8f5ee] text-[#1B4332]"
                      : "text-[#1a1a1a] hover:bg-[#f7f6f4]"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => addCountry(option.id)}
                >
                  <span>{option.name}</span>
                  <span className="font-mono text-[10px] font-semibold uppercase text-[#888]">
                    {option.id}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {open && query.trim() && filtered.length === 0 ? (
          <div className="absolute z-[70] mt-1 w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#888] shadow-lg">
            No matching countries
          </div>
        ) : null}
      </div>

      {hint ? <p className="mt-1 text-[11px] text-[#888]">{hint}</p> : null}

      {value.map((code) => (
        <input key={code} type="hidden" name={hiddenInputName} value={code} />
      ))}
    </div>
  );
}
