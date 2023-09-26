import { usePathname } from "next/navigation";
import Link from "next/link";

import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { type Icon, Icons } from "#/components/icons";
import { ProfileSwitcher } from "#/components/profile-switcher";
import { Button } from "#/components/ui/button";
import { ThemeToggle } from "./theme-provider";

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
          "flex items-center gap-6 lg:gap-2 p-1.5 rounded-sm",
          "text-base lg:text-[1rem] leading-5 lg:font-medium",
          "hover:bg-foreground/[0.025]",
          {
            "bg-foreground/[0.025]": pathname === href,
          }
        )}
      >
        <Icon className="h-6 lg:h-9" strokeWidth={1.5} />
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
      className={cn("flex flex-col justify-between h-full", className)}
      {...props}
    >
      <div className="flex-1 flex flex-col">
        <nav className="flex-1 lg:pt-6">
          <ul role="list" className="space-y-0">
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
        <div className="mb-4">
          {/* TODO: https://ui.shadcn.com/docs/components/accordion */}
          <button
            className={cn(
              "w-full flex items-center gap-6 lg:gap-2 p-1.5 rounded-sm",
              "text-sm leading-5 lg:font-medium text-secondary-foreground",
              "hover:bg-foreground/[0.025]"
            )}
          >
            <Icons.settings className="h-6 lg:h-9" strokeWidth={1.5} />
            <div className="flex justify-between items-center w-full">
              <span>Settings</span>
              <Icons.chevronDown
                className="text-foreground/50 h-4 lg:h-5"
                strokeWidth={1.5}
              />
            </div>
          </button>

          <ThemeToggle>
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
          </ThemeToggle>
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
