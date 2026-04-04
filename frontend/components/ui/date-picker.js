"use client";

import { Input } from "@/components/ui/input";

export function DatePicker({ value, onChange, min, max, disabled = false }) {
  return (
    <Input
      type="date"
      value={value || ""}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
