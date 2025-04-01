"use client";

import { ImplementerRole } from "@prisma/client";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { signOut } from "next-auth/react";
import * as React from "react";

import { selectPersonnel } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "#/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { fetchPersonnel } from "#/lib/actions/fetch-personnel";
import { APP_ENV, constants } from "#/lib/constants";
import { cn } from "#/lib/utils";

export type Personnel = {
  id: string;
  role: ImplementerRole;
  label: string;
  hub?: string;
  project?: string;
};

export function PersonnelSwitcher({
  personnel,
  activePersonnelId,
}: {
  personnel: Personnel[];
  activePersonnelId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const onSelectPersonnel = async (
    personnelId: string,
    role: ImplementerRole,
  ) => {
    await selectPersonnel({ identifier: personnelId, role });
    setLoading(true);
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="rounded-md border border-zinc-200/60 bg-gradient-to-br from-zinc-50 to-transparent px-1.5 py-3">
      <div className="ml-2 flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-700">
          Impersonate Supervisor, Fellow, HC OR Ops
        </div>
        {loading && (
          <Spinner className="-ml-1 mr-3 h-5 w-5 animate-spin text-zinc-600" />
        )}
      </div>
      <div className="mt-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="base"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between px-2"
            >
              <span className="text-left">
                {activePersonnelId
                  ? personnel.find(
                      (personnel) => personnel.id === activePersonnelId,
                    )?.label
                  : loading
                    ? "Loading..."
                    : "Select personnel..."}
              </span>
              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="rounded-t-none p-0 md:w-72">
            <Command
              filter={(value: string, search: string) => {
                const person = personnel.find((person) => person.id === value);
                if (!person) return 0;

                if (person.label.toLowerCase().includes(search.toLowerCase())) {
                  return 1;
                }
                return 0;
              }}
            >
              <CommandInput placeholder="Search personnel..." className="h-9" />
              <CommandEmpty>No personnel found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-scroll">
                {personnel.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={person.id}
                    onSelect={async (_currentValue) => {
                      onSelectPersonnel(person.id, person.role);
                      setOpen(false);
                    }}
                    className="rounded-none border-b last:border-b-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[8px] font-medium uppercase leading-4 tracking-widest">
                        <span className="capitalize text-shamiri-new-blue">
                          {person.role.replace("_", " ")}{" "}
                        </span>
                      </div>
                      <span className="text-sm">{person.label}</span>
                      <span className="text-[8px] uppercase tracking-widest text-muted-foreground">
                        {person.hub}
                      </span>
                    </div>
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        activePersonnelId === person.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function Spinner({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

export function PersonnelTool() {
  const [personnel, setPersonnel] = React.useState<Personnel[]>([]);
  const [activePersonnelId, setActivePersonnelId] = React.useState("");

  React.useEffect(() => {
    const fetchData = async () => {
      const response = await fetchPersonnel();
      if (response) {
        setActivePersonnelId(response.activePersonnelId);
        setPersonnel(response.personnel);
      }
    };

    fetchData();
  }, []);

  const visible =
    constants.NEXT_PUBLIC_ENV !== "production" || APP_ENV === "testing";

  return (
    <>
      {/* TODO: enable devs to use this in prod for user support / debugging */}
      {visible && (
        <PersonnelSwitcher
          personnel={personnel}
          activePersonnelId={activePersonnelId}
        />
      )}
    </>
  );
}
