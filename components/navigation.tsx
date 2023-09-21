import { usePathname } from "next/navigation";
import Link from "next/link";

import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { type Icon, Icons } from "#/components/icons";
import { ProfileSwitcher } from "#/components/profile-switcher";

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
        <div></div>
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
