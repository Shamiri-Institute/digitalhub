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
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "#/lib/auth/session-user";
import { signOut } from "#/lib/auth-client";
import { useState } from "react";
import type { AdminProject } from "#/app/(platform)/layout";
import type { CurrentPersonnel } from "#/app/auth";
import { MembershipSwitcher } from "#/components/common/membership-switcher";
import { ProfileDialog } from "#/components/common/profile/profile-dialog";
import { ProjectSwitcher } from "#/components/common/project-switcher";
import { RoleSwitcher } from "#/components/common/role-switcher";
import { Button } from "#/components/ui/button";
import type { ImplementerPersonnel } from "#/lib/actions/fetch-personnel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

import { roleHome } from "#/lib/auth/role-home";
import { cn, getInitials } from "#/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toastOnError } from "#/components/ui/use-toast";

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

function roleTabs(mainRoute: string, isSuperAdmin: boolean, canManageSurveys: boolean) {
  switch (mainRoute) {
    case "admin":
      // Hiding the Users and Surveys tabs is cosmetic: their pages and actions check access themselves.
      return [
        scheduleTab,
        { segment: "hubs", label: "Hubs", icon: Building2, alsoActiveOn: "schools" },
        ticketsTab,
        ...(isSuperAdmin ? [{ segment: "users", label: "Users", icon: Users }] : []),
        ...(canManageSurveys ? [surveysTab] : []),
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
    case "ct":
      return [supervisorsTab, fellowsTab, studentsTab, clinicalTab, triageTab, ticketsTab];
    default:
      return [];
  }
}

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
  isSuperAdmin,
  canManageSurveys,
  adminProjects,
  personnel,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
  profile: CurrentPersonnel | null;
  isAdminUser: boolean;
  isSuperAdmin: boolean;
  canManageSurveys: boolean;
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
      <AvatarFallback>{userInitials}</AvatarFallback>
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
          className="nav-link"
        />
      )}
      {personnel && (
        <div className="nav-link">
          <RoleSwitcher
            loading={loading}
            setLoading={setLoading}
            user={user}
            implementerMembers={personnel}
          />
        </div>
      )}
      {isAdminUser && (
        <div className="nav-link">
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
      {!pathname.startsWith("/ops/") && (
        <DropdownMenuItem
          className="gap-2 px-4 py-3 lg:px-2 lg:py-1.5"
          onSelect={() => setIsProfileOpen(true)}
        >
          <UserRound className="size-4 text-shamiri-text-grey" />
          My Profile
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        className="gap-2 px-4 py-3 lg:px-2 lg:py-1.5"
        onSelect={toastOnError(signOut)}
      >
        <LogOut className="size-4 text-shamiri-text-grey" />
        Sign out
      </DropdownMenuItem>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background-secondary border-b">
        <div className="container space-y-4 px-4 pt-2 lg:px-8">
          <div className="flex flex-col items-center justify-between lg:flex-row">
            <div className="flex w-full flex-row items-center justify-between px-3 py-2 lg:py-0">
              <Link href={homeHref} className="text-shamiri-new-blue text-2xl">
                Shamiri Hub
              </Link>
              <div className="relative lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Account menu"
                      className="bg-white"
                    >
                      <Menu className="text-muted-foreground h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm">
                    <DropdownMenuLabel className="flex items-center gap-4 px-4 font-normal">
                      {avatar}
                      <span className="text-muted-foreground min-w-0 truncate text-base">
                        {displayName}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {hasSwitchers && (
                      <>
                        {renderSwitchers("flex flex-col py-2")}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {accountMenuItems}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-4 py-2 lg:flex">
              {hasSwitchers && renderSwitchers("flex flex-row items-center gap-4")}
              <DropdownMenu>
                <DropdownMenuTrigger className="nav-link items-center rounded-md">
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
            className="no-scrollbar flex items-center gap-8 overflow-x-auto ps-2 pe-10 mask-r-from-90% lg:mask-none"
          >
            {roleTabs(mainRoute, isSuperAdmin, canManageSurveys).map((tab) => {
              const active = subRoute === tab.segment || subRoute === tab.alsoActiveOn;
              return (
                <Link
                  key={tab.segment}
                  href={`/${mainRoute}/${tab.segment}`}
                  ref={active ? revealActiveTab : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn("tab-link", active && "active")}
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
                  className={cn("tab-link cursor-pointer", reportingActive && "active")}
                >
                  <ChartColumn className="size-5" />
                  Reporting
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href={`/${mainRoute}/reporting/expenses/fellows`}>Expenses</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${mainRoute}/reporting/school-reports`}>School Reports</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${mainRoute}/reporting/fellow-reports`}>Fellow Reports</Link>
                  </DropdownMenuItem>
                  {(mainRoute === "sc" || mainRoute === "hc") && (
                    <DropdownMenuItem asChild>
                      <Link href={`/${mainRoute}/reporting/monitoring-and-evaluation`}>
                        Monitoring and Evaluation
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {mainRoute === "sc" && (
                    <DropdownMenuItem asChild>
                      <Link href={`/${mainRoute}/reporting/recordings`}>Session Recordings</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </header>
      {/* overflow-x-clip (not -hidden): hidden makes <main> a scroll container, which breaks
          position:sticky for every descendant; clip clips without capturing sticky.
          pb-20 lets the last row and the footer scroll clear of the floating Sentry button. */}
      <main className="bg-background-secondary flex min-h-0 grow items-stretch overflow-x-clip pb-20">
        {children}
      </main>
      <ProfileDialog isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} profile={profile} />
    </div>
  );
}
