"use client";

import type * as React from "react";
import type { ImplementerRole } from "#/db/enums";
import { Check, Filter } from "lucide-react";
import { useState } from "react";
import { selectPersonnel } from "#/app/actions";
import { signOut } from "#/lib/auth-client";
import { toast } from "#/components/ui/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "#/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Button } from "#/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import type { ImplementerPersonnel } from "#/lib/actions/fetch-personnel";
import type { Personnel } from "#/lib/types/personnel";
import { cn } from "#/lib/utils";

interface RoleSwitcherProps {
  trigger: React.ReactElement;
  setLoading: (loading: boolean) => void;
  implementerMembers: ImplementerPersonnel;
}

// Development-only impersonation helper; the layout loads personnel only in development.
export function RoleSwitcher({ trigger, setLoading, implementerMembers }: RoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<ImplementerRole>>(new Set());

  const handleRoleChange = async (member: Personnel) => {
    setLoading(true);
    try {
      const data = await selectPersonnel({ identifier: member.id, role: member.role });

      if (!data) {
        throw new Error("Failed to update personnel");
      }

      await signOut();
    } catch (error) {
      console.error("Failed to switch role:", error);
      toast({ variant: "destructive", description: "Could not switch role. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const availableRoles: ImplementerRole[] = Array.from(
    new Set(implementerMembers.personnel.map((member) => member.role)),
  ).toSorted();

  const filteredPersonnel =
    selectedRoles.size === 0
      ? implementerMembers.personnel
      : implementerMembers.personnel.filter((member) => selectedRoles.has(member.role));

  const handleRoleToggle = (role: ImplementerRole) => {
    setSelectedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <span className="px-4 pb-1 pt-2 text-xs uppercase tracking-widest text-muted-foreground">
            select member to impersonate
          </span>
          <CommandSeparator />
          <div className="relative">
            <CommandInput
              placeholder={`Search ${filteredPersonnel.length} members...`}
              className="h-9 w-full"
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                className="absolute right-1 top-0.5"
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0",
                      selectedRoles.size > 0
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary",
                    )}
                    aria-label="Filter by role"
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" side="right" className="w-48">
                {availableRoles.map((role) => (
                  <DropdownMenuCheckboxItem
                    key={role}
                    checked={selectedRoles.has(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                    className="capitalize"
                  >
                    {role.replace("_", " ").toLowerCase()}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CommandEmpty>No members found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-scroll">
            {filteredPersonnel.map((member) => (
              <CommandItem
                key={member.id}
                value={`${member.role.replace("_", " ")} ${member.label} ${member.hub}`}
                onSelect={() => {
                  void handleRoleChange(member);
                  setOpen(false);
                }}
                className="flex items-center justify-between gap-3 rounded-none border-b px-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      <span className="text-primary">{member.role.replace("_", " ")}</span>
                    </span>
                    <span className="font-medium">{member.label}</span>
                    <span className="min-h-4 text-xs uppercase tracking-widest text-muted-foreground">
                      {member.hub ? `${member.hub}` : ""}
                    </span>
                  </div>
                </div>
                <Check
                  className={cn(
                    "h-4 w-4",
                    member.id === implementerMembers.activePersonnelId
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
  );
}
