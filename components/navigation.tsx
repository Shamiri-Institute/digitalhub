import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { fetchPersonnel } from "#/app/actions";
import { PersonnelSwitcher } from "#/app/dev-personnel-switcher";
import { Icons, type Icon } from "#/components/icons";
import { ProfileSwitcher } from "#/components/profile-switcher";
import { Separator } from "#/components/ui/separator";
import { constants } from "#/lib/constants";
import { cn } from "#/lib/utils";

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
          "flex items-center gap-6 rounded-sm p-1.5 lg:gap-2",
          "text-base leading-5 lg:text-[1rem] lg:font-medium",
          "hover:bg-foreground/[0.025]",
          {
            "bg-foreground/[0.025]": pathname === href,
          },
        )}
      >
        <Icon className="h-6 w-6 lg:h-9 lg:w-6" />
        <div>{children}</div>
      </Link>
    </li>
  );
}

export function Navigation({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"nav">) {
  return (
    <div
      className={cn("flex h-full flex-col justify-between", className)}
      {...props}
    >
      <div className="flex flex-1 flex-col">
        <SupervisorNavigation />
      </div>
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

export function PersonnelTool() {
  const [personnel, setPersonnel] = React.useState<
    {
      id: string;
      type: "supervisor" | "hc";
      label: string;
    }[]
  >([]);
  const [activePersonnelId, setActivePersonnelId] = React.useState("");

  React.useEffect(() => {
    const fetchData = async () => {
      const response = await fetchPersonnel();
      if (response) {
        setActivePersonnelId(response.activePersonnelId);
        setPersonnel(response.personnel);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      {/* TODO: possibly enable devs to use this in prod */}
      {constants.NEXT_PUBLIC_ENV === "development" && (
        <PersonnelSwitcher
          personnel={personnel}
          activePersonnelId={activePersonnelId}
        />
      )}
    </>
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
        <NavItem href="/students" Icon={Icons.backpack}>
          Students
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

type Role = "admin" | "hub-coordinator" | "supervisor";
const AllRoles: Role[] = ["admin", "hub-coordinator", "supervisor"];
const HubCoordinatorAndAboveRoles: Role[] = ["admin", "hub-coordinator"];
const SupervisorAndAboveRoles: Role[] = [
  "admin",
  "hub-coordinator",
  "supervisor",
];

interface NavigationItem {
  path: string;
  title: string;
  Icon: Icon;
  roles: Role[];
}

const navigationItems: NavigationItem[] = [
  {
    path: "/",
    title: "Home",
    Icon: Icons.home,
    roles: AllRoles,
  },
  {
    path: "/schools",
    title: "Schools",
    Icon: Icons.schoolMinusOutline,
    roles: SupervisorAndAboveRoles,
  },
  {
    path: "/screenings",
    title: "Screenings",
    Icon: Icons.heartHandshake,
    roles: SupervisorAndAboveRoles,
  },
  {
    path: "/profile",
    title: "Profile",
    Icon: Icons.user,
    roles: SupervisorAndAboveRoles,
  },
];

function SupervisorNavigation() {
  return (
    <nav className="flex-1 lg:pt-6">
      <ul role="list" className="space-y-0">
        {navigationItems.map((item) => {
          return (
            <NavItem key={item.path} href={item.path} Icon={item.Icon}>
              {item.title}
            </NavItem>
          );
        })}
      </ul>
    </nav>
  );
}
