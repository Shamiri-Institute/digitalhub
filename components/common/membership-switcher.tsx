"use client";

import { getCurrentUser } from "#/app/auth";
import { Button } from "#/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "#/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { fetchPersonnelMemberships } from "#/lib/actions/fetch-personnel";
import { cn } from "#/lib/utils";
import { ImplementerRole } from "@prisma/client";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
}: {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) {
  const { data: session, update } = useSession();
  const [open, setOpen] = useState(false);
  const [memberships, setMemberships] = useState<JWTMembership[]>(session?.user?.memberships || []);

  const { activeMembership } = session?.user || {};

  useEffect(() => {
    const getMemberships = async () => {
      if (!activeMembership) {
        return;
      }
      const memberships = await fetchPersonnelMemberships(activeMembership).then((memberships) => {
        return memberships.map((membership) => ({
          id: membership.id,
          implementerId: membership.implementer.id,
          identifier: membership.identifier,
          implementerName: membership.implementer.implementerName,
          role: membership.role,
        }));
      });
      setMemberships(memberships);
    };
    getMemberships();
  }, [session, activeMembership]);

  const handleMembershipChange = async (membership: JWTMembership) => {
    if (activeMembership?.id === membership.id) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await update({
        user: {
          ...session?.user,
          activeMembership: membership,
        },
        trigger: "update",
      });

      // Force a hard refresh to ensure the new session is picked up
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
          role="combobox"
          aria-expanded={open}
          className="-mt-1 w-full min-w-[200px] justify-between bg-white px-2 text-left filter disabled:pointer-events-none disabled:grayscale"
          disabled={loading || !activeMembership}
        >
          <div className="flex flex-col items-start">
            <span className="text-base font-medium">
              {activeMembership
                ? activeMembership.implementerName
                : "Select implementer..."}
            </span>
          </div>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <span className="text-[9px] tracking-widest pt-2 pb-1 px-4 uppercase text-muted-foreground">
            switch implementer
          </span>
          <CommandSeparator />
          <CommandInput placeholder="Search implementers..." className="h-9" />
          <CommandEmpty>No implementers found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-scroll">
            {memberships?.map((membership) => (
              <CommandItem
                key={membership.id}
                value={membership.implementerName + " " + membership.role}
                onSelect={() => {
                  handleMembershipChange(membership);
                  setOpen(false);
                }}
                className="flex items-center gap-3 justify-between rounded-none border-b border-gray-200 px-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {membership.implementerName}
                    </span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground text-shamiri-new-blue">
                    {membership.role.replace("_", " ")}
                  </span>
                </div>
                <CheckIcon
                  className={cn(
                    "h-4 w-4",
                    activeMembership?.id === membership.id
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
