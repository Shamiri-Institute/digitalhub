import { cn } from "#/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Icons } from "#/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Separator } from "#/components/ui/separator";
import Link from "next/link";

const demoProfile = {
  organization: {
    avatarUrl: "https://i.imgur.com/1s8jfQi.png",
    name: "Team Shamiri",
    initials: "TS",
  },
  user: {
    avatarUrl:
      "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    initials: "KS",
    email: "kenya@shamiri.institute",
  },
};

export function ProfileSwitcher() {
  return (
    <div className="flex justify-between -ml-1.5">
      <OrganizationDialog className="flex items-center gap-1.5 hover:bg-card px-1.5 py-1 rounded-lg transition active:scale-95">
        <OrganizationAvatar />
        <div className="text-sm font-medium">
          {demoProfile.organization.name}
        </div>
        <Icons.chevronsUpDown
          className={cn("h-5 text-foreground/50", "animate-in hover:fade-in")}
          strokeWidth={1}
        />
      </OrganizationDialog>
      <button className="rounded p-1 hover:bg-card transition active:scale-95">
        <Avatar className="bg-foreground/10 h-10 w-10 md:h-8 md:w-8">
          <AvatarImage src={demoProfile.user.avatarUrl} />
          <AvatarFallback>{demoProfile.user.initials}</AvatarFallback>
        </Avatar>
      </button>
    </div>
  );
}

function OrganizationDialog({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger className={className}>{children}</PopoverTrigger>
      <PopoverContent
        className="p-0"
        side="right"
        sideOffset={-100}
        align="end"
        alignOffset={200}
      >
        <div>
          <button className="p-3 pl-3.5 flex flex-col w-full">
            <div className="text-sm text-muted-foreground">
              {demoProfile.user.email}
            </div>
            <div className="flex items-center my-2 py-1 px-3 justify-between w-full hover:bg-foreground/[0.025] rounded-md">
              <div className="flex items-center gap-2">
                <OrganizationAvatar />
                <div className="text-sm font-medium">
                  {demoProfile.organization.name}
                </div>
              </div>
              <Icons.check className="h-5 text-brand" strokeWidth={1} />
            </div>
          </button>
          <div className="text-sm">
            <Separator />
            <div className="flex flex-col p-1.5">
              <Link
                href="/organization/settings"
                className="p-2 hover:bg-foreground/3 rounded-md"
              >
                Organization settings
              </Link>
              <Link
                href="/organization/members"
                className="p-2 hover:bg-foreground/3 rounded-md"
              >
                Invite & manage members
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

function OrganizationAvatar() {
  return (
    <Avatar className="rounded-lg bg-foreground/5 dark:bg-foreground/10 h-10 w-10 md:h-8 md:w-8">
      <AvatarImage src={demoProfile.organization.avatarUrl} />
      <AvatarFallback className="rounded-xl">
        {demoProfile.organization.initials}
      </AvatarFallback>
    </Avatar>
  );
}
