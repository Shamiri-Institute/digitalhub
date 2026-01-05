"use client";

import type { Supervisor } from "@prisma/client";
import { useState } from "react";
import FilterToggle from "#/app/(platform)/hc/components/filter-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";

export default function SupervisorFilterToggle({
  supervisors,
}: {
  supervisors: Supervisor[];
}) {
  const [open, setOpen] = useState(false);
  const [filterIsActive] = useState(false);

  return (
    <FilterToggle
      filterIsActive={filterIsActive}
      open={open}
      setOpen={setOpen}
      setDefaultFilters={() => {}}
    >
      <div className="flex flex-col gap-y-2 p-1">
        <Select onValueChange={(value) => {}}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Pick supervisor" />
          </SelectTrigger>
          <SelectContent>
            {supervisors.map((supervisor) => {
              return (
                <SelectItem key={supervisor.id} value={supervisor.id} className="text-sm">
                  {supervisor.supervisorName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </FilterToggle>
  );
}
