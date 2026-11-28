"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import type { FilterOption } from "#/lib/survey/filter-options";

// Radix Select can't hold an empty value, so "every" option has a value of its own.
const EVERY = "every";

/** Sets one filter in the address, or clears it for "every", and clears `resetKeys` with it. */
export function useSearchParamFilter(resetKeys: readonly string[] = []) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    for (const resetKey of resetKeys) params.delete(resetKey);
    if (value === EVERY) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
}

export function withCounts(options: readonly FilterOption[]) {
  return options.map((option) => ({
    value: option.id,
    label: `${option.label} (${option.count})`,
  }));
}

export function FilterSelect({
  label,
  everyLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  everyLabel: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-shamiri-text-grey">{label}</span>
      <Select value={value ?? EVERY} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EVERY}>{everyLabel}</SelectItem>
          {/* A filter chosen before its last item left the list stays visible. */}
          {value && !options.some((option) => option.value === value) && (
            <SelectItem value={value}>Nothing waiting here</SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
