"use client";

import { selectPersonnel } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  fetchImplementerPersonnel,
  type ImplementerPersonnel,
} from "#/lib/actions/fetch-personnel";
import type { Personnel } from "#/lib/types/personnel";
import { cn } from "#/lib/utils";
import type { ImplementerRole } from "@prisma/client";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Filter } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

interface JWTMembership {
  id: number;
  implementerId: string;
  implementerName: string;
  role: ImplementerRole;
  identifier: string | null;
}

export function RoleSwitcher({
  loading,
  setLoading,
  activeMembership,
}: {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  activeMembership: JWTMembership | null;
}) {
  const [open, setOpen] = useState(false);
  const [implementerMembers, setImplementerMembers] = useState<ImplementerPersonnel | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<ImplementerRole>>(new Set());

  useEffect(() => {
    const fetchImplementerMembers = async () => {
      if (!activeMembership) {
        return;
      }
      const implementerMembers = await fetchImplementerPersonnel(activeMembership);

      setImplementerMembers(implementerMembers);
    };
    fetchImplementerMembers();
  }, [activeMembership]);

  const handleRoleChange = async (member: Personnel) => {
    setLoading(true);
    try {
      await selectPersonnel({ identifier: member.id, role: member.role });
      signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Failed to switch role:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique roles from personnel
  const availableRoles: ImplementerRole[] = implementerMembers?.personnel
    ? Array.from(new Set(implementerMembers.personnel.map((member) => member.role))).sort()
    : [];

  // Filter personnel based on selected roles
  const filteredPersonnel = implementerMembers?.personnel
    ? selectedRoles.size === 0
      ? implementerMembers.personnel
      : implementerMembers.personnel.filter((member) => selectedRoles.has(member.role))
    : [];

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
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className="-mt-1 w-full min-w-[300px] justify-between bg-white px-2 text-left filter disabled:pointer-events-none disabled:grayscale"
          disabled={loading || !activeMembership}
        >
          <div className="flex flex-col items-start">
            <span className="text-base font-medium">
              {activeMembership ? (
                <div className="flex flex-row items-baseline gap-3">
                  <span className="font-medium">
                    {
                      implementerMembers?.personnel?.find(
                        (member) => member.id === implementerMembers.activePersonnelId,
                      )?.label
                    }
                  </span>
                  <span className="text-xs uppercase tracking-widest text-shamiri-new-blue">
                    {" - "}
                    {activeMembership.role.replace("_", " ")}
                  </span>
                </div>
              ) : (
                "Select member"
              )}
            </span>
          </div>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <span className="px-4 pb-1 pt-2 text-[9px] uppercase tracking-widest text-muted-foreground">
            select member to impersonate
          </span>
          <CommandSeparator />
          <div className="relative">
            <CommandInput
              placeholder={`Search ${filteredPersonnel.length} members...`}
              className="h-9 w-full"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="absolute right-1 top-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted p-0"
                  aria-label="Filter by role"
                >
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
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
                  handleRoleChange(member);
                  setOpen(false);
                }}
                className="flex items-center justify-between gap-3 rounded-none border-b px-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      <span className="text-shamiri-new-blue">{member.role.replace("_", " ")}</span>
                    </span>
                    <span className="font-medium">{member.label}</span>
                    <span className="min-h-[10px] text-[8px] uppercase tracking-widest text-muted-foreground">
                      {member.hub ? `${member.hub}` : ""}
                    </span>
                  </div>
                </div>
                <CheckIcon
                  className={cn(
                    "h-4 w-4",
                    member.id === implementerMembers?.activePersonnelId
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
