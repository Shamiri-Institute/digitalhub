import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { type Icon, Icons } from "#/components/icons";
import { usePathname } from "next/navigation";

export const navigation: Array<any> = [];

function NavItem({
  href,
  Icon,
  children,
}: {
  href: string;
  Icon: Icon;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-4 lg:gap-2 p-1.5 rounded-sm",
          "text-base lg:text-sm leading-5 lg:font-medium",
          "dark:hover:bg-foreground/[0.025] hover:bg-foreground/[0.05]",
          {
            "dark:bg-foreground/[0.025] bg-foreground/[0.05]":
              pathname === href,
          }
        )}
      >
        <Icon className="h-6 lg:h-4" strokeWidth={1.5} />
        {children}
      </Link>
    </li>
  );
}

export function Navigation(props: React.ComponentPropsWithoutRef<"nav">) {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex-1">
        <nav {...props}>
          <ul role="list" className="">
            <NavItem href="/students" Icon={Icons.backpack}>
              Students
            </NavItem>
            <NavItem href="/fellows" Icon={Icons.users2}>
              Fellows
            </NavItem>
            <NavItem href="/screenings" Icon={Icons.listTodo}>
              Screenings
            </NavItem>
            <NavItem href="/schools" Icon={Icons.graduationCap}>
              Schools
            </NavItem>
          </ul>
        </nav>
      </div>
      <div>
        <Separator />
        <div>
          <div className="m-4 md:mx-0">
            <ProfileSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSwitcher() {
  const profile = {
    organization: {
      avatarUrl: "https://i.imgur.com/1s8jfQi.png",
      name: "Team Shamiri",
      initials: "TS",
    },
    user: {
      avatarUrl:
        "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      initials: "TO",
    },
  };
  return (
    <div className="flex justify-between -ml-1.5">
      <button className="flex items-center gap-1.5 hover:bg-card px-1.5 py-1 rounded-lg transition active:scale-95">
        <Avatar className="rounded-lg bg-foreground/5 dark:bg-foreground/10 h-10 w-10 md:h-8 md:w-8">
          <AvatarImage src={profile.organization.avatarUrl} />
          <AvatarFallback className="rounded-xl">
            {profile.organization.initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm font-medium">{profile.organization.name}</div>
        <Icons.chevronsUpDown
          className={cn("h-5 text-foreground/50", "animate-in hover:fade-in")}
          strokeWidth={1}
        />
      </button>
      <button className="rounded p-1 hover:bg-card transition active:scale-95">
        <Avatar className="bg-foreground/10 h-10 w-10 md:h-8 md:w-8">
          <AvatarImage src={profile.user.avatarUrl} />
          <AvatarFallback>{profile.user.initials}</AvatarFallback>
        </Avatar>
      </button>
    </div>
  );
}
