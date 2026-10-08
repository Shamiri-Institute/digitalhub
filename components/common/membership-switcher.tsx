"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { setActiveMembership } from "#/lib/actions/active-membership";
import type { JWTMembership, SessionUser } from "#/lib/auth/session-user";
import { cn } from "#/lib/utils";

export function MembershipSwitcher({
  loading,
  setLoading,
  user,
  isAdminUser,
}: {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  user: SessionUser | null;
  isAdminUser: boolean;
}) {
  const [open, setOpen] = useState(false);
  const activeMembership = user?.activeMembership ?? null;
  const memberships = user?.memberships ?? [];

  if (!isAdminUser) {
    return null;
  }

  const handleMembershipChange = async (membership: JWTMembership) => {
    if (activeMembership?.id === membership.id) return;

    setLoading(true);
    try {
      await setActiveMembership(membership.id);
      window.location.assign("/");
    } catch (error) {
      console.error("Failed to switch membership:", error);
      toast({
        variant: "destructive",
        description: "Could not switch membership. Please try again.",
      });
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
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                  void handleMembershipChange(membership);
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
                <Check
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
