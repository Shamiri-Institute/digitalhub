"use client";

import {
  Building2,
  Calendar,
  ChartColumn,
  ChevronDown,
  CircleUser,
  ClipboardList,
  GraduationCap,
  LogOut,
  type LucideIcon,
  Menu,
  School,
  ShieldAlert,
  Stethoscope,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "#/lib/auth/session-user";
import { signOut } from "#/lib/auth-client";
import { useState } from "react";
import type { AdminProject } from "#/app/(platform)/layout";
import type { CurrentPersonnel } from "#/app/auth";
import { MembershipSwitcher } from "#/components/common/membership-switcher";
import { ProjectSwitcher } from "#/components/common/project-switcher";
import { RoleSwitcher } from "#/components/common/role-switcher";
import { Button } from "#/components/ui/button";
import type { ImplementerPersonnel } from "#/lib/actions/fetch-personnel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

import { roleHome } from "#/lib/auth/role-home";
import { Icons } from "#/components/icons";
import { toastOnError } from "#/components/ui/use-toast";
import { cn, getInitials } from "#/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export type AdminTabs = { users: boolean; surveys: boolean; payouts: boolean };

// Loaded when opened: its form pulls in libphonenumber-js and the date picker, which no other part
// of the shell needs on every page.
const ProfileDialog = dynamic(
  () => import("#/components/common/profile/profile-dialog").then((mod) => mod.ProfileDialog),
  { ssr: false },
);

type RoleTab = { segment: string; label: string; icon: LucideIcon; alsoActiveOn?: string };

const scheduleTab: RoleTab = { segment: "schedule", label: "Schedule", icon: Calendar };
const schoolsTab: RoleTab = { segment: "schools", label: "Schools", icon: School };
const supervisorsTab: RoleTab = { segment: "supervisors", label: "Supervisors", icon: Users };
const fellowsTab: RoleTab = { segment: "fellows", label: "Fellows", icon: CircleUser };
const studentsTab: RoleTab = { segment: "students", label: "Students", icon: GraduationCap };
const clinicalTab: RoleTab = { segment: "clinical", label: "Clinical cases", icon: Stethoscope };
const triageTab: RoleTab = { segment: "triage", label: "Triage", icon: ShieldAlert };
const ticketsTab: RoleTab = { segment: "tickets", label: "Tickets", icon: Ticket };
const surveysTab: RoleTab = { segment: "surveys", label: "Surveys", icon: ClipboardList };

function roleTabs(mainRoute: string, adminTabs: AdminTabs) {
  switch (mainRoute) {
    case "admin":
      // Hiding the Users, Surveys and Reporting tabs is cosmetic: their pages and actions check access themselves.
      return [
        scheduleTab,
        { segment: "hubs", label: "Hubs", icon: Building2, alsoActiveOn: "schools" },
        ticketsTab,
        ...(adminTabs.users ? [{ segment: "users", label: "Users", icon: Users }] : []),
        ...(adminTabs.surveys ? [surveysTab] : []),
        ...(adminTabs.payouts
          ? [{ segment: "reporting", label: "Reporting", icon: ChartColumn }]
          : []),
      ];
    case "hc":
      return [
        scheduleTab,
        schoolsTab,
        supervisorsTab,
        fellowsTab,
        studentsTab,
        ticketsTab,
        surveysTab,
      ];
    case "sc":
      return [scheduleTab, schoolsTab, fellowsTab, studentsTab, clinicalTab, triageTab, ticketsTab];
    case "fel":
      return [
        scheduleTab,
        schoolsTab,
        { segment: "portal", label: "Fellow portal", icon: CircleUser },
        ticketsTab,
      ];
    case "cl":
      return [supervisorsTab, fellowsTab, studentsTab, clinicalTab, triageTab, ticketsTab];
    case "ct":
      return [supervisorsTab, fellowsTab, studentsTab, clinicalTab];
    default:
      return [];
  }
}

const tabClass = (active: boolean) =>
  cn(
    "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-[3px] py-2.5 font-semibold transition-colors [&_svg]:shrink-0",
    active
      ? "border-lime text-white"
      : "border-transparent text-white/75 hover:border-white/40 hover:text-white",
  );

// Centres the active tab in the phone tab strip without scrolling the page.
function revealActiveTab(activeTab: HTMLElement | null) {
  const tabStrip = activeTab?.parentElement;
  if (!activeTab || !tabStrip) return;
  const tabBox = activeTab.getBoundingClientRect();
  const stripBox = tabStrip.getBoundingClientRect();
  tabStrip.scrollLeft += tabBox.left - stripBox.left - (stripBox.width - tabBox.width) / 2;
}

export function LayoutClient({
  children,
  user,
  profile,
  isAdminUser,
  adminTabs,
  adminProjects,
  personnel,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
  profile: CurrentPersonnel | null;
  isAdminUser: boolean;
  adminTabs: AdminTabs;
  adminProjects: AdminProject[] | null;
  personnel: ImplementerPersonnel | null;
}) {
  const pathname = usePathname();
  const [mainRoute = "", subRoute] = pathname.slice(1).split("/");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayName = user?.name || user?.email || "";
  const userInitials = user?.name ? getInitials(user.name) : displayName.charAt(0).toUpperCase();
  const avatarUrl = user?.image ?? null;
  const homeHref = user?.activeMembership ? roleHome[user.activeMembership.role] : "/";
  const hasSwitchers = adminProjects !== null || personnel !== null || isAdminUser;
  const hasReporting = !["fel", "cl", "ct", "admin"].includes(mainRoute);
  const reportingActive = subRoute === "reporting";

  const avatar = (
    <Avatar className="h-8 w-8" aria-hidden>
      {avatarUrl ? <AvatarImage src={avatarUrl} width={32} height={32} alt="" /> : null}
      <AvatarFallback className="bg-lavender-20 text-sm font-bold text-primary">
        {userInitials}
      </AvatarFallback>
    </Avatar>
  );

  const renderSwitchers = (className: string) => (
    <div className={className}>
      {adminProjects && (
        <ProjectSwitcher
          loading={loading}
          setLoading={setLoading}
          user={user}
          projects={adminProjects}
        />
      )}
      {personnel && (
        <div>
          <RoleSwitcher
            loading={loading}
            setLoading={setLoading}
            user={user}
            implementerMembers={personnel}
          />
        </div>
      )}
      {isAdminUser && (
        <div>
          <MembershipSwitcher
            loading={loading}
            setLoading={setLoading}
            user={user}
            isAdminUser={isAdminUser}
          />
        </div>
      )}
    </div>
  );

  // The phone menu and the desktop account menu show the same items; only one is visible.
  const accountMenuItems = (
    <>
      <DropdownMenuItem
        className="gap-2 px-4 py-3 lg:px-2 lg:py-1.5"
        onClick={() => setIsProfileOpen(true)}
      >
        <UserRound className="size-4 text-muted-foreground" />
        My Profile
      </DropdownMenuItem>
      <DropdownMenuItem
        className="gap-2 px-4 py-3 lg:px-2 lg:py-1.5"
        onClick={toastOnError(signOut)}
      >
        <LogOut className="size-4 text-muted-foreground" />
        Sign out
      </DropdownMenuItem>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary text-white [&_:focus-visible]:outline-lime">
        <div className="container flex items-center justify-between gap-4 px-4 pt-3 lg:px-8">
          <Link href={homeHref} className="flex items-center gap-3 rounded-sm">
            <Icons.logo className="h-7 w-auto text-white" />
            <span className="sr-only">Shamiri home</span>
            <span className="hidden border-l border-white/30 pl-3 text-sm font-semibold uppercase tracking-wider text-white/80 sm:block">
              Digital Hub
            </span>
          </Link>
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="icon" aria-label="Account menu">
                    <Menu className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm">
                <DropdownMenuLabel className="flex items-center gap-4 px-4 font-normal">
                  {avatar}
                  <span className="min-w-0 truncate text-base text-muted-foreground">
                    {displayName}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasSwitchers && (
                  <>
                    {renderSwitchers("flex flex-col gap-2 px-2 py-2")}
                    <DropdownMenuSeparator />
                  </>
                )}
                {accountMenuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="hidden shrink-0 items-center gap-4 lg:flex">
            {hasSwitchers && renderSwitchers("flex flex-row items-center gap-3")}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md py-1 font-semibold text-white/90 hover:text-white">
                {avatar}
                <span className="max-w-72 truncate">{displayName}</span>
                <ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 max-w-none">
                {accountMenuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav
          aria-label="Main"
          className="no-scrollbar container mt-2 flex items-center gap-7 overflow-x-auto px-4 pe-10 mask-r-from-90% lg:px-8 lg:mask-none"
        >
          {roleTabs(mainRoute, adminTabs).map((tab) => {
            const active = subRoute === tab.segment || subRoute === tab.alsoActiveOn;
            return (
              <Link
                key={tab.segment}
                href={`/${mainRoute}/${tab.segment}`}
                ref={active ? revealActiveTab : undefined}
                aria-current={active ? "page" : undefined}
                className={tabClass(active)}
              >
                <tab.icon className="size-5" />
                {tab.label}
              </Link>
            );
          })}
          {hasReporting && (
            <DropdownMenu>
              <DropdownMenuTrigger
                ref={reportingActive ? revealActiveTab : undefined}
                className={cn(tabClass(reportingActive), "cursor-pointer")}
              >
                <ChartColumn className="size-5" />
                Reporting
                <ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLinkItem
                  render={<Link href={`/${mainRoute}/reporting/expenses/fellows`}>Expenses</Link>}
                />
                <DropdownMenuLinkItem
                  render={
                    <Link href={`/${mainRoute}/reporting/school-reports`}>School Reports</Link>
                  }
                />
                <DropdownMenuLinkItem
                  render={
                    <Link href={`/${mainRoute}/reporting/fellow-reports`}>Fellow Reports</Link>
                  }
                />
                {(mainRoute === "sc" || mainRoute === "hc") && (
                  <DropdownMenuLinkItem
                    render={
                      <Link href={`/${mainRoute}/reporting/monitoring-and-evaluation`}>
                        Monitoring and Evaluation
                      </Link>
                    }
                  />
                )}
                {mainRoute === "sc" && (
                  <DropdownMenuLinkItem
                    render={
                      <Link href={`/${mainRoute}/reporting/recordings`}>Session Recordings</Link>
                    }
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </header>
      {/* overflow-x-clip (not -hidden): hidden makes <main> a scroll container, which breaks
          position:sticky for every descendant; clip clips without capturing sticky.
          pb-20 lets the last row and the footer scroll clear of the floating Sentry button. */}
      <main className="flex min-h-0 grow items-stretch overflow-x-clip bg-white pb-20">
        {children}
      </main>
      {isProfileOpen && (
        <ProfileDialog isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} profile={profile} />
      )}
    </div>
  );
}
