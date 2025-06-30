import { Prisma } from "@prisma/client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";

import { Icons } from "#/components/icons";
import { OrganizationAvatar, UserAvatar } from "#/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { constants } from "#/tests/constants";

const fallbackProfile = {
  organization: {
    avatarUrl: "https://i.imgur.com/1s8jfQi.png",
    name: "Shamiri Institute",
    email: "tech@shamiri.institute",
  },
};

export function ProfileSwitcher() {
  const { data: session, status } = useSession();

  const implementerId = session?.user?.activeMembership?.implementerId;

  const [implementerInfo, setImplementerInfo] =
    React.useState<
      Prisma.ImplementerGetPayload<{
        include: {
          avatar: {
            include: {
              file: true;
            };
          };
        };
      }>
    >();

  React.useEffect(() => {
    if (implementerId) {
      fetch(`/api/implementers/${implementerId}`)
        .then((response) => response.json())
        .then((data) => setImplementerInfo(data));
    }
  }, [implementerId, session, status]);

  return (
    <div className="-ml-1.5 flex justify-between">
      <OrganizationDialog>
        <button
          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-card active:scale-95"
          data-testid={constants.ORGANIZATION_SWITCHER}
        >
          <OrganizationAvatar
            src={fallbackProfile.organization.avatarUrl}
            fallback={fallbackProfile.organization.name}
          />
          <div className="text-sm font-medium">
            {implementerInfo?.implementerName ??
              fallbackProfile.organization.name}
          </div>
          <Icons.chevronsUpDown
            className={cn("h-5 text-foreground/50", "animate-in hover:fade-in")}
            strokeWidth={1}
          />
        </button>
      </OrganizationDialog>
      <button className="rounded p-1 transition hover:bg-card active:scale-95">
        <UserAvatar
          src={session?.user?.image || ""}
          fallback={session?.user?.name || "??"}
        />
      </button>
    </div>
  );
}

function OrganizationDialog({ children }: { children: React.ReactNode }) {
  const session = useSession();

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="p-0"
        side="right"
        sideOffset={-100}
        align="end"
        alignOffset={200}
      >
        <div>
          <div className="flex w-full flex-col p-3 pl-3.5">
            <div className="text-sm text-muted-foreground">
              {session?.data?.user?.email}
            </div>
            <button className="my-2 flex w-full items-center justify-between rounded-md px-1.5 py-1 hover:bg-foreground/[0.025]">
              <div className="flex items-center gap-2">
                <OrganizationAvatar
                  src={fallbackProfile.organization.avatarUrl}
                  fallback={fallbackProfile.organization.name}
                />
                <div className="text-sm font-medium">
                  {fallbackProfile.organization.name}
                </div>
              </div>
              <Icons.check className="h-5 text-brand" strokeWidth={1} />
            </button>
          </div>
          <div className="text-sm">
            <Separator />
            <div className="flex flex-col p-1.5">
              <Link
                href="/settings/organization/members"
                className="rounded-md p-2 hover:bg-foreground/3"
                data-testid={constants.ORGANIZATION_MEMBERS_LINK}
              >
                Add & manage members
              </Link>
            </div>
            <Separator />
            <div className="flex flex-col p-1.5">
              <button
                className="flex-start flex rounded-md p-2 hover:bg-foreground/3"
                onClick={() => {
                  signOut({
                    callbackUrl: "/login",
                  });
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
