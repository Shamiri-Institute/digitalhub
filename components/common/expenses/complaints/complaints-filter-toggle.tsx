"use client";

import FilterToggle from "#/app/(platform)/hc/components/filter-toggle";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#/components/ui/select";
import { useState } from "react";

export default function ComplaintsFilterToggle() {
  const [open, setOpen] = useState(false);
  const [filterIsActive, setFilterIsActive] = useState(false);

  // TODO: Implement the filter functionality when doing the hc flow-wide filter refactor
  return (
    <FilterToggle
      filterIsActive={filterIsActive}
      setDefaultFilters={() => {}}
      open={open}
      setOpen={setOpen}
    >
      <div className="flex flex-col gap-y-2 p-1">
        <Select onValueChange={(value) => {}}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Pick a complaint" />
          </SelectTrigger>
          <SelectContent>
            {/* {[].map((complaint) => {
              return (
                <SelectItem
                  key={complaint?.id}
                  value={complaint.id}
                  className="text-sm"
                >
                  {complaint.complaintName}
                </SelectItem>
              );
            })} */}
          </SelectContent>
        </Select>
      </div>
    </FilterToggle>
  );
}
