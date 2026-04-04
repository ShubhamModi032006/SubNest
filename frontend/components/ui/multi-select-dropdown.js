"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiSelectDropdown({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const selectedLabels = useMemo(() => {
    const set = new Set(selectedValues || []);
    return options.filter((item) => set.has(item.value)).map((item) => item.label);
  }, [options, selectedValues]);

  const toggleValue = (value) => {
    const current = new Set(selectedValues || []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    onChange(Array.from(current));
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="truncate text-left">
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-md border border-border/60 bg-card p-2 shadow-xl">
          {options.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No options available</p>
          ) : (
            options.map((item) => {
              const checked = (selectedValues || []).includes(item.value);
              return (
                <label
                  key={item.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
