"use client";

import type { Prisma } from "@prisma/client";
import { useState } from "react";
import FilterToggle from "#/app/(platform)/hc/components/filter-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";

export default function FellowPayoutFilterToggle({
  payout,
}: {
  payout: Prisma.PayoutStatementsGetPayload<{}>[];
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
            <SelectValue placeholder="Pick date" />
          </SelectTrigger>
          <SelectContent>
            {payout.map((payout) => (
              <SelectItem key={payout.id} value={payout.id}>
                {/* TODO: DATE? OR */}
                {payout.amount || "No amount"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FilterToggle>
  );
}
