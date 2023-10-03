import Link from "next/link";

import { cn } from "#/lib/utils";
import { constants } from "#/tests/constants";
import { OrganizationAvatar, UserAvatar } from "#/components/ui/avatar";
import { Icons } from "#/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Separator } from "#/components/ui/separator";

const demoProfile = {
  organization: {
    avatarUrl: "https://i.imgur.com/1s8jfQi.png",
    name: "Team Shamiri",
    email: "team@shamiri.institute",
  },
  user: {
    avatarUrl:
      "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    name: "Kenya Shamiri",
    email: "kenya@shamiri.institute",
  },
};

export function ProfileSwitcher() {
  return (
    <div className="flex justify-between -ml-1.5">
      <OrganizationDialog>
        <button
          className="flex items-center gap-1.5 hover:bg-card px-1.5 py-1 rounded-lg transition active:scale-95"
          data-testid={constants.ORGANIZATION_SWITCHER}
        >
          <OrganizationAvatar
            src={demoProfile.organization.avatarUrl}
            fallback={demoProfile.organization.name}
          />
          <div className="text-sm font-medium">
            {demoProfile.organization.name}
          </div>
          <Icons.chevronsUpDown
            className={cn("h-5 text-foreground/50", "animate-in hover:fade-in")}
            strokeWidth={1}
          />
        </button>
      </OrganizationDialog>
      <button className="rounded p-1 hover:bg-card transition active:scale-95">
        <UserAvatar
          src={demoProfile.user.avatarUrl}
          fallback={demoProfile.user.name}
        />
      </button>
    </div>
  );
}

function OrganizationDialog({ children }: { children: React.ReactNode }) {
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
          <div className="p-3 pl-3.5 flex flex-col w-full">
            <div className="text-sm text-muted-foreground">
              {demoProfile.user.email}
            </div>
            <button className="flex items-center my-2 py-1 px-1.5 justify-between w-full hover:bg-foreground/[0.025] rounded-md">
              <div className="flex items-center gap-2">
                <OrganizationAvatar
                  src={demoProfile.organization.avatarUrl}
                  fallback={demoProfile.organization.name}
                />
                <div className="text-sm font-medium">
                  {demoProfile.organization.name}
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
                className="p-2 hover:bg-foreground/3 rounded-md"
                data-testid={constants.ORGANIZATION_MEMBERS_LINK}
              >
                Add & manage members
              </Link>
            </div>
            <Separator />
            <div className="flex flex-col p-1.5">
              <button className="p-2 flex flex-start hover:bg-foreground/3 rounded-md">
                Log out
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
