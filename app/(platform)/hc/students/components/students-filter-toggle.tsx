"use client";

import FilterToggle from "#/app/(platform)/hc/components/filter-toggle";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "#/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { SESSION_TYPES } from "#/lib/app-constants/constants";
import { Prisma, SessionStatus } from "@prisma/client";
import { useState } from "react";

export default function StudentsFilterToggle({
  students,
}: {
  students: Prisma.StudentGetPayload<{}>[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] =
    useState<Prisma.StudentGetPayload<{}> | null>(null);
  const [filterIsActive, setFilterIsActive] = useState(false);

  return (
    <FilterToggle
      filterIsActive={filterIsActive}
      updateFilters={() => {
        setOpen(false);
      }}
      setDefaultFilters={() => { }}
    >
      <div className="flex flex-col gap-y-2 p-1">
        <Select
          onValueChange={(value) => { }}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Pick school" />
          </SelectTrigger>
          <SelectContent>
            {students.map((school) => {
              return (
                <SelectItem
                  key={school.id}
                  value={school.id}
                  className="text-sm"
                >
                  {school.studentName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {selectedStudents !== null && (
          <DropdownMenuCheckboxItem
            checked={true}
            onCheckedChange={(value) => {
              if (!value) {
                setSelectedStudents(null);
              }
            }}
            onSelect={(e) => {
              e.preventDefault();
            }}
          >
            <span className="">{selectedStudents?.studentName}</span>
          </DropdownMenuCheckboxItem>
        )}
      </div>
      <div className="flex gap-8 px-1">
        <div>
          <DropdownMenuLabel>
            <span className="text-xs font-medium uppercase text-shamiri-text-grey">
              SESSION TYPE
            </span>
          </DropdownMenuLabel>
          {SESSION_TYPES.map((sessionType) => {
            return (
              <DropdownMenuCheckboxItem
                key={sessionType.name}
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <span className="">{sessionType.description}</span>
              </DropdownMenuCheckboxItem>
            );
          })}
        </div>
        <div>
          <DropdownMenuLabel>
            <span className="text-xs font-medium uppercase text-shamiri-text-grey">
              Status
            </span>
          </DropdownMenuLabel>
          {Object.keys(SessionStatus).map((status) => {
            return (
              <DropdownMenuCheckboxItem
                key={status}
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <span className="">{status}</span>
              </DropdownMenuCheckboxItem>
            );
          })}
        </div>
      </div>
    </FilterToggle>
  );
}
