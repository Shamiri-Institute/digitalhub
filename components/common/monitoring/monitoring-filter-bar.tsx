"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import type { FilterOption } from "#/lib/monitoring/viewer-filters";

const ALL_OPTIONS = "all";

function FilterSelect({
  label,
  paramName,
  options,
  selectedId,
}: {
  label: string;
  paramName: string;
  options: FilterOption[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <label className="flex min-w-48 flex-col gap-1 text-sm font-medium">
      {label}
      <Select
        value={selectedId ?? ALL_OPTIONS}
        onValueChange={(value) => {
          const nextParams = new URLSearchParams(searchParams);
          if (value === ALL_OPTIONS) nextParams.delete(paramName);
          else nextParams.set(paramName, value);
          router.push(`${pathname}?${nextParams.toString()}`);
        }}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OPTIONS}>All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function MonitoringFilterBar({
  hubName,
  ownSupervisorName,
  schoolOptions,
  supervisorOptions,
  fellowOptions,
  selectedSchoolId,
  selectedSupervisorId,
  selectedFellowId,
}: {
  hubName: string;
  ownSupervisorName: string | null;
  schoolOptions: FilterOption[];
  supervisorOptions: FilterOption[];
  fellowOptions: FilterOption[];
  selectedSchoolId: string | null;
  selectedSupervisorId: string | null;
  selectedFellowId: string | null;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <p className="flex flex-col gap-1 text-sm font-medium">
        Hub
        <span className="font-normal text-shamiri-text-dark-grey">{hubName}</span>
      </p>
      {ownSupervisorName ? (
        <p className="flex flex-col gap-1 text-sm font-medium">
          You
          <span className="font-normal text-shamiri-text-dark-grey">{ownSupervisorName}</span>
        </p>
      ) : (
        <FilterSelect
          label="Supervisor"
          paramName="supervisor"
          options={supervisorOptions}
          selectedId={selectedSupervisorId}
        />
      )}
      <FilterSelect
        label="School"
        paramName="school"
        options={schoolOptions}
        selectedId={selectedSchoolId}
      />
      <FilterSelect
        label="Fellow"
        paramName="fellow"
        options={fellowOptions}
        selectedId={selectedFellowId}
      />
    </div>
  );
}
