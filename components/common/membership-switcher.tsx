"use client";

import { ImplementerRole } from "@prisma/client";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
import { isAdminUserByEmail } from "#/lib/actions/fetch-personnel";
import { cn } from "#/lib/utils";

interface JWTMembership {
  id: number;
  implementerId: string;
  implementerName: string;
  role: ImplementerRole;
  identifier: string | null;
}

export function MembershipSwitcher({
  loading,
  setLoading,
  session,
}: {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  session: Session | null;
}) {
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const activeMembership = session?.user?.activeMembership ?? null;
  const memberships = session?.user?.memberships ?? [];
  const [isAdminUser, setIsAdminUser] = useState(activeMembership?.role === ImplementerRole.ADMIN);

  useEffect(() => {
    const checkIsAdminUser = async () => {
      const checkIsAdminUser = await isAdminUserByEmail(session?.user?.email ?? "");
      if (checkIsAdminUser) {
        setIsAdminUser(true);
      }
    };
    checkIsAdminUser();
    console.log(session);
  }, [session]);

  if (!isAdminUser) {
    return null;
  }

  const handleMembershipChange = async (membership: JWTMembership) => {
    if (activeMembership?.id === membership.id) return;

    setLoading(true);
    try {
      await update({
        user: {
          activeMembership: membership,
        },
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch membership:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className="-mt-1 w-full min-w-[200px] justify-between bg-white px-2 text-left filter disabled:pointer-events-none disabled:grayscale"
          disabled={loading || !activeMembership}
        >
          <div className="flex flex-col items-start">
            <span className="text-base font-medium">
              {activeMembership ? activeMembership.implementerName : "Select implementer..."}
            </span>
          </div>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <span className="px-4 pb-1 pt-2 text-[9px] uppercase tracking-widest text-muted-foreground">
            switch implementer
          </span>
          <CommandSeparator />
          <CommandInput placeholder="Search implementers..." className="h-9" />
          <CommandEmpty>No implementers found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-scroll">
            {memberships?.map((membership) => (
              <CommandItem
                key={membership.id}
                value={`${membership.implementerName} - ${membership.role}`}
                onSelect={() => {
                  handleMembershipChange(membership);
                  setOpen(false);
                }}
                className="flex items-center justify-between gap-3 rounded-none border-b border-gray-200 px-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{membership.implementerName}</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground text-shamiri-new-blue">
                    {membership.role.replace("_", " ")}
                  </span>
                </div>
                <CheckIcon
                  className={cn(
                    "h-4 w-4",
                    activeMembership?.id === membership.id ? "opacity-100" : "opacity-0",
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
