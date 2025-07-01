"use client";

import { ImplementerRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type * as React from "react";

import { PersonnelTool } from "#/components/common/dev-personnel-switcher";
import { type Icon, Icons } from "#/components/icons";
import { ProfileSwitcher } from "#/components/profile-switcher";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";

export const navigation: Array<any> = [];

interface NavItemProps {
  href: string;
  Icon: Icon;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ href, Icon, children }) => {
  const pathname = usePathname();

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-6 rounded-xl p-1.5 lg:gap-2 lg:pl-3",
          "text-base leading-5 lg:text-[1rem] lg:font-medium",
          "hover:bg-foreground/[0.035]",
          {
            "bg-shamiri-blue/[0.075] hover:bg-shamiri-blue/[0.1]": pathname === href,
          },
        )}
      >
        <Icon className="h-6 w-6 lg:h-9 lg:w-6" />
        <div>{children}</div>
      </Link>
    </li>
  );
};

export function Navigation({ className, ...props }: React.ComponentPropsWithoutRef<"nav">) {
  const session = useSession();
  if (session.status !== "authenticated") {
    return null;
  }

  const user = session.data.user;
  const { activeMembership } = user;

  let navigationDiv: React.ReactNode = null;
  switch (activeMembership?.role) {
    case ImplementerRole.SUPERVISOR:
      navigationDiv = <SupervisorNavigation />;
      break;
    case ImplementerRole.HUB_COORDINATOR:
      navigationDiv = <HubCoordinatorNavigation />;
      break;
    case ImplementerRole.OPERATIONS:
      navigationDiv = <OperationsNavigation />;
      break;
    case ImplementerRole.ADMIN:
      navigationDiv = <AdminNavigation />;
      break;
    default:
      // default to this for now
      navigationDiv = <SupervisorNavigation />;
      break;
  }

  return (
    <div className={cn("flex h-full flex-col justify-between", className)} {...props}>
      <div className="flex flex-1 flex-col">{navigationDiv}</div>
      <div>
        <div className="mb-4">
          <PersonnelTool />
        </div>
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

function AdminNavigation() {
  return (
    <nav>
      <ul role="list" className="space-y-0">
        <NavItem href="/" Icon={Icons.home}>
          Home
        </NavItem>
        <NavItem href="/schools" Icon={Icons.schoolMinusOutline}>
          Schools
        </NavItem>
        <NavItem href="/fellows" Icon={Icons.users2}>
          Fellows
        </NavItem>
        <NavItem href="/screenings" Icon={Icons.listTodo}>
          Screenings
        </NavItem>
      </ul>
    </nav>
  );
}

interface NavigationItem {
  path: string;
  title: string;
  Icon: Icon;
}

const supervisorNavigationItems: NavigationItem[] = [
  {
    path: "/",
    title: "Home",
    Icon: Icons.home,
  },
  {
    path: "/schools",
    title: "Schools",
    Icon: Icons.schoolMinusOutline,
  },
  {
    path: "/screenings",
    title: "Clinical Cases",
    Icon: Icons.heartHandshake,
  },
  {
    path: "/profile",
    title: "Profile",
    Icon: Icons.user,
  },
];

function SupervisorNavigation() {
  return (
    <nav className="flex-1 lg:pt-6">
      <ul role="list" className="space-y-2">
        {supervisorNavigationItems.map((item) => (
          <NavItem key={item.path} href={item.path} Icon={item.Icon}>
            {item.title}
          </NavItem>
        ))}
      </ul>
    </nav>
  );
}

const hubCoordinatorNavigationItems: NavigationItem[] = [
  {
    path: "/hc",
    title: "Home",
    Icon: Icons.home,
  },
  {
    path: "/hc/hubs",
    title: "Hubs",
    Icon: Icons.hubspot,
  },
  {
    path: "/hc/expenses",
    title: "Expenses",
    Icon: Icons.wallet,
  },
];

function HubCoordinatorNavigation() {
  return (
    <nav className="flex-1 lg:pt-6">
      <ul role="list" className="space-y-2">
        {hubCoordinatorNavigationItems.map((item) => (
          <NavItem key={item.path} href={item.path} Icon={item.Icon}>
            {item.title}
          </NavItem>
        ))}
      </ul>
    </nav>
  );
}

const operationsNavigationItems: NavigationItem[] = [
  // TODO: Add the navigation items for the Operations role here
];

function OperationsNavigation() {
  return (
    <nav className="flex-1 lg:pt-6">
      <ul role="list" className="space-y-2">
        {operationsNavigationItems.map((item) => (
          <NavItem key={item.path} href={item.path} Icon={item.Icon}>
            {item.title}
          </NavItem>
        ))}
      </ul>
    </nav>
  );
}
