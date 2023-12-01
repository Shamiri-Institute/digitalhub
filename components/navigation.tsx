import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icons, type Icon } from "#/components/icons";
import { ProfileSwitcher } from "#/components/profile-switcher";
import { Separator } from "#/components/ui/separator";
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
        <HubCoordinatorNavigation />
      </div>
      <div>
        <div className="mb-4">
          {/* TODO: https://ui.shadcn.com/docs/components/accordion */}
          <button
            className={cn(
              "flex w-full items-center gap-6 rounded-sm p-1.5 lg:gap-2",
              "text-sm leading-5 text-secondary-foreground lg:font-medium",
              "hover:bg-foreground/[0.025]",
            )}
          >
            <Icons.settings className="h-6 lg:h-9" strokeWidth={1.5} />
            <div className="flex w-full items-center justify-between">
              <span>Settings</span>
              <Icons.chevronDown
                className="h-4 text-foreground/50 lg:h-5"
                strokeWidth={1.5}
              />
            </div>
          </button>

          {/* <ThemeToggle>
            <button
              className={cn(
                "w-full flex items-center gap-6 lg:gap-2 p-1.5 rounded-sm",
                "text-sm leading-5 lg:font-medium",
                "hover:bg-foreground/[0.025]"
              )}
            >
              <Icons.sun className="h-6 lg:h-9" strokeWidth={1.5} />
              <div className="flex justify-between items-center w-full">
                <span>Light theme</span>
              </div>
            </button>
          </ThemeToggle> */}
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
    title: "Dashboard",
    Icon: Icons.layoutDashboard,
    roles: AllRoles,
  },
  {
    path: "/supervisors",
    title: "Supervisors",
    Icon: Icons.clipboardList,
    roles: HubCoordinatorAndAboveRoles,
  },
  {
    path: "/fellows",
    title: "Fellows",
    Icon: Icons.graduationCapIcon,
    roles: SupervisorAndAboveRoles,
  },
  {
    path: "/schools",
    title: "Schools",
    Icon: Icons.backpack,
    roles: SupervisorAndAboveRoles,
  },
  {
    path: "/payouts",
    title: "Payouts",
    Icon: Icons.banknote,
    roles: SupervisorAndAboveRoles,
  },
  {
    path: "/hubs",
    title: "Hubs",
    Icon: Icons.network,
    roles: HubCoordinatorAndAboveRoles,
  },
  {
    path: "/reports",
    title: "Reports",
    Icon: Icons.pieChart,
    roles: HubCoordinatorAndAboveRoles,
  },
  // todo: take to supervisor
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

function HubCoordinatorNavigation() {
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
