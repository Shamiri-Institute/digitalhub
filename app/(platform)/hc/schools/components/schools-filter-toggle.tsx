"use client";

import FilterToggle from "#/app/(platform)/hc/components/filter-toggle";
import {
  SchoolsFiltersContext,
  sessionTypeFilterOptions,
  statusFilterOptions,
} from "#/app/(platform)/hc/schools/context/schools-filters-context";
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
import { useContext, useState } from "react";

export default function SchoolsFilterToggle({
  schools,
}: {
  schools: Prisma.SchoolGetPayload<{
    include: {
      assignedSupervisor: true;
    };
  }>[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<Prisma.SchoolGetPayload<{
    include: {
      assignedSupervisor: true;
    };
  }> | null>(null);
  const { filters, setFilters } = useContext(SchoolsFiltersContext);
  const [filterIsActive, setFilterIsActive] = useState(false);
  const [sessionTypes, setSessionTypes] = useState(filters.sessionTypes);
  const [statusTypes, setStatusTypes] = useState(filters.statusTypes);
  const defaultFilterSettings = {
    sessionTypes: sessionTypeFilterOptions,
    statusTypes: statusFilterOptions,
    selectedSchool: null,
    setSelectedSchool: () => {},
  };

  return (
    <SchoolsFiltersContext.Provider value={{ filters, setFilters }}>
      <FilterToggle
        filterIsActive={filterIsActive}
        updateFilters={() => {
          setOpen(false);
          setFilters({
            sessionTypes,
            statusTypes,
            selectedSchool,
            setSelectedSchool,
          });
        }}
        setDefaultFilters={() => setFilters(defaultFilterSettings)}
      >
        <div className="flex flex-col gap-y-2 p-1">
          <Select
            onValueChange={(value) => {
              const school = schools.find((school) => school.id === value);
              if (school) {
                setSelectedSchool(school);
              }
            }}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Pick school" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school) => {
                return (
                  <SelectItem
                    key={school.id}
                    value={school.id}
                    className="text-sm"
                  >
                    {school.schoolName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedSchool !== null && (
            <DropdownMenuCheckboxItem
              checked={true}
              onCheckedChange={(value) => {
                if (!value) {
                  setSelectedSchool(null);
                }
              }}
              onSelect={(e) => {
                e.preventDefault();
              }}
            >
              <span className="">{selectedSchool?.schoolName}</span>
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
                  checked={sessionTypes[sessionType.name]}
                  onCheckedChange={(value) => {
                    const state = { ...sessionTypes };
                    state[sessionType.name] = value;
                    setSessionTypes(state);
                  }}
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
                  checked={statusTypes[status]}
                  onCheckedChange={(value) => {
                    const state = { ...statusTypes };
                    state[status] = value;
                    setStatusTypes(state);
                  }}
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
    </SchoolsFiltersContext.Provider>
  );
}
