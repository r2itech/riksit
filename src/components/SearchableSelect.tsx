"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
} from "react";

export interface SearchableOption {
  code: string;
  name: string;
}

interface Props {
  value: string;
  options: SearchableOption[];
  placeholder: string;
  ariaLabel: string;
  title?: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

/**
 * Minimal accessible combobox: input you can type into to filter, with click
 * + arrow-key + Enter selection. No external dependency.
 */
export default function SearchableSelect({
  value,
  options,
  placeholder,
  ariaLabel,
  title,
  onChange,
  disabled = false,
}: Props) {
  const reactId = useId();
  const listId = `${reactId}-list`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => options.find((o) => o.code === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  // When opening, default highlight to the currently selected option (if any).
  useEffect(() => {
    if (!open) return;
    if (query) {
      setHighlight(0);
      return;
    }
    const idx = filtered.findIndex((o) => o.code === value);
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, query, filtered, value]);

  // Click outside → close + discard pending query.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted item in view while arrow-navigating.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLLIElement>(
      `[data-idx="${highlight}"]`,
    );
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const choose = (opt: SearchableOption) => {
    onChange(opt.code);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKey = (e: RKeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) choose(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    } else if (e.key === "Tab") {
      // Allow tab to close without committing.
      setOpen(false);
      setQuery("");
    }
  };

  const displayValue = open ? query : selected?.name ?? "";

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className="riksit-select w-full"
        value={displayValue}
        placeholder={selected && !open ? selected.name : placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(e) => {
          if (!open) setOpen(true);
          setQuery(e.target.value);
        }}
        onKeyDown={onKey}
      />
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="
            absolute z-50 mt-1 w-full max-h-56 overflow-y-auto riksit-thin-scroll
            rounded-md border border-riksit-neon/30
            bg-riksit-bg/95 backdrop-blur
            shadow-glow text-[11px] font-mono
            py-0.5
          "
        >
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-[10px] text-riksit-muted">
              Tidak ada hasil
            </li>
          ) : (
            filtered.map((opt, i) => {
              const active = i === highlight;
              const isSelected = opt.code === value;
              return (
                <li
                  key={opt.code}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  className={`px-2 py-1 cursor-pointer transition-colors leading-tight ${
                    active
                      ? "bg-riksit-neon/15 text-riksit-neon"
                      : isSelected
                        ? "text-riksit-neon"
                        : "text-riksit-ink hover:bg-riksit-neon/10"
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    // Prevent the input's blur from firing before our click.
                    e.preventDefault();
                    choose(opt);
                  }}
                >
                  {opt.name}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
