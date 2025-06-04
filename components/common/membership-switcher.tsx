"use client";

import { revalidatePageAction } from "#/app/(platform)/fel/schools/actions";
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

function getRoleColor(role: ImplementerRole): string {
  switch (role) {
    case "ADMIN":
      return "text-red-600";
    case "HUB_COORDINATOR":
      return "text-blue-600";
    case "SUPERVISOR":
      return "text-green-600";
    case "FELLOW":
      return "text-purple-600";
    case "CLINICAL_LEAD":
      return "text-orange-600";
    case "OPERATIONS":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
}

export function MembershipSwitcher() {
  const { data: session, update } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    console.log(session?.user.activeMembership);
  }, [session]);

  if (!session?.user?.memberships || session.user.memberships.length <= 1) {
    return null;
  }

  const { activeMembership, memberships } = session.user;

  const handleMembershipChange = async (membership: JWTMembership) => {
    console.log(membership);
    if (activeMembership?.id === membership.id) return;

    setLoading(true);
    try {
      await update({
        user: {
          ...session?.user,
          activeMembership: membership,
        },
      });

      // revalidatePageAction(pathname);
      router.reload();
    } catch (error) {
      console.error("Failed to switch membership:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white px-2 text-left"
            disabled={loading}
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
            <CommandInput placeholder="Search implementers..." className="h-9" />
            <CommandEmpty>No implementers found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-scroll">
              {memberships?.map((membership) => (
                <CommandItem
                  key={membership.id}
                  value={membership.implementerName + ' ' + membership.role}
                  onSelect={() => {
                    handleMembershipChange(membership);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between px-3"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium"
                      >
                        {membership.implementerName}
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      {membership.role}
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
    </>
  );
}
