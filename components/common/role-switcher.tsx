"use client";

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
import { ImplementerPersonnel } from "#/lib/actions/fetch-personnel";
import { cn } from "#/lib/utils";
import { ImplementerRole, Prisma } from "@prisma/client";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface JWTMembership {
  id: number;
  implementerId: string;
  implementerName: string;
  role: ImplementerRole;
  identifier: string | null;
}

export function RoleSwitcher({ implementerMembers }: { implementerMembers: ImplementerPersonnel | null }) {
  const { data: session, update } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  console.log(implementerMembers?.personnel.length);

  if (!session?.user?.activeMembership) {
    return null;
  }

  const activeMembership = implementerMembers?.activePersonnelId ? implementerMembers.personnel.find((member) => member.id === implementerMembers.activePersonnelId) : null;

  const handleRoleChange = async (role: ImplementerRole) => {
    if (activeMembership?.role === role) return;

    setLoading(true);
    try {
      await update({
        user: {
          ...session?.user,
          activeMembership: {
            ...activeMembership,
            role,
          },
        },
      });

      // Force a hard refresh to ensure the new session is picked up
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch role:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="-mt-1 w-full justify-between bg-white px-2 text-left"
          disabled={loading}
        >
          <div className="flex flex-col items-start">
            <span className="text-base font-medium">
              {activeMembership
                ? <div className="flex flex-row items-baseline gap-3">
                      <span className="font-medium">{activeMembership.label}</span>
                      <span className="text-shamiri-new-blue text-xs uppercase tracking-widest">{" - "}{activeMembership.role.replace("_", " ")}</span>
                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground flex items-center">
                        {activeMembership.hub ? `${activeMembership.hub}` : ""}
                    </span>
                  </div>
                : "Select member..."}
            </span>
          </div>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." className="h-9" />
          <CommandEmpty>No members found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-scroll">
            {implementerMembers?.personnel?.map((member) => (
              <CommandItem
                key={member.id}
                value={member.role.replace("_", " ") + " " + member.label + " " + member.hub}
                onSelect={() => {
                  // handleRoleChange(role);
                  // setOpen(false);
                }}
                className="flex items-center justify-between px-3 rounded-none border-b last:border-b-0"
              >
                <div className="flex flex-col">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      <span className="text-shamiri-new-blue">{member.role.replace("_", " ")}</span>
                    </span>
                    <span className="font-medium">
                      {member.label}
                    </span>
                    <span className="text-[8px] min-h-[10px] uppercase tracking-widest text-muted-foreground">
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