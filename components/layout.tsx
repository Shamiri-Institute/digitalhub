"use client";

import {
  BarChartIcon,
  CalendarIcon,
  FeedbackIcon,
  GraduationCapIcon,
  HelpIcon,
  NotificationIcon,
  PeopleIcon,
  PeopleIconAlternate,
  RoleIcon,
  SchoolIcon,
  SignOutIcon,
} from "components/icons";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import type {
  CurrentClinicalLead,
  CurrentClinicalTeam,
  CurrentFellow,
  CurrentHubCoordinator,
  CurrentOpsUser,
  CurrentSupervisor,
} from "#/app/auth";
import { PersonnelTool } from "#/components/common/dev-personnel-switcher";
import { ProfileDialog } from "#/components/common/profile/profile-dialog";
import { Footer } from "#/components/footer";
import { Header } from "#/components/header";
import { Icons } from "#/components/icons";
import { Navigation } from "#/components/navigation";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { APP_ENV, constants } from "#/lib/constants";
import { cn } from "#/lib/utils";
import ArrowDropdown from "../public/icons/arrow-drop-down.svg";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface NavigationLinkProps {
  scheduleActive: boolean;
  schoolsActive: boolean;
  supervisorsActive: boolean;
  fellowsActive: boolean;
  studentsActive: boolean;
  clinicalActive: boolean;
  reportingActive: boolean;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean) => void;
}

export function Layout({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile:
    | CurrentHubCoordinator
    | CurrentSupervisor
    | CurrentFellow
    | CurrentClinicalLead
    | CurrentOpsUser
    | CurrentClinicalTeam
    | null;
}) {
  const pathname = usePathname();
  const session = useSession();

  // TODO: this logic should be made more straightforward
  if (
    pathname.startsWith("/hc/") ||
    pathname.startsWith("/sc/") ||
    pathname.startsWith("/fel/") ||
    pathname.startsWith("/cl/") ||
    pathname.startsWith("/ops/") ||
    pathname.startsWith("/ct/")
  ) {
    return (
      <LayoutV2
        userName={session.data?.user.name ?? "N/A"}
        avatarUrl={session.data?.user.image}
        pathname={pathname}
        profile={profile}
      >
        {children}
      </LayoutV2>
    );
  }

  return (
    <div className="h-full max-w-7xl lg:ml-72 xl:ml-80">
      <motion.header
        layoutScroll
        className="contents lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex"
      >
        <div className="contents lg:pointer-events-auto lg:block lg:w-72 lg:overflow-y-auto lg:border-r lg:border-border lg:px-6 lg:pb-8 lg:pt-4 xl:w-80">
          <div className="hidden lg:flex">
            <Link href="/" aria-label="Home">
              <Icons.logo className="h-6" />
            </Link>
          </div>
          <Header />
          <Navigation className="hidden lg:flex" />
        </div>
      </motion.header>
      <div className="relative mx-auto flex h-full flex-col px-4 pt-20 sm:px-6 lg:px-8">
        <main className="flex-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

function LayoutV2({
  children,
  userName,
  avatarUrl,
  pathname,
  profile,
}: {
  children: React.ReactNode;
  userName: string;
  avatarUrl?: string | null;
  pathname: string;
  profile:
    | CurrentHubCoordinator
    | CurrentSupervisor
    | CurrentFellow
    | CurrentClinicalLead
    | CurrentOpsUser
    | CurrentClinicalTeam
    | null;
}) {
  const [mainRoute, subRoute] = pathname.slice(1).split("/"); // get the path under the 'hc' route. fix this when we add other roles
  const schoolsActive = subRoute?.includes("schools");
  const scheduleActive = subRoute?.includes("schedule");
  const supervisorsActive = subRoute?.includes("supervisor");
  const fellowsActive = subRoute?.includes("fellow");
  const studentsActive = subRoute?.includes("student");
  const reportingActive = subRoute?.includes("reporting");
  const clinicalActive = subRoute?.includes("clinical");

  const activeColor = "#0085FF";
  const inactiveColour = "#969696";
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setPopoverOpen(false);
  }, [pathname]);

  const renderNavigationLinks = (className?: string) => {
    return (
      <div className={className}>
        <div className="nav-link">
          <PersonnelToolPopover>
            <div className="flex items-center gap-2">
              <RoleIcon fill="#0085FF" />
              <div className="text-shamiri-new-blue">Switch Role</div>
            </div>
          </PersonnelToolPopover>
        </div>
        <div className="nav-link">
          <FeedbackIcon />
          <Link href="#">Feedback</Link>
        </div>
        <div className="nav-link">
          <HelpIcon />
          <Link href="#">Help</Link>
        </div>
        <div className="nav-link hidden lg:flex">
          <NotificationIcon />
          {/*TODO: notification counter */}
        </div>
        <div className="nav-link hidden w-full lg:flex lg:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex w-full items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    {avatarUrl ? <AvatarImage src={avatarUrl} width={32} height={32} /> : null}
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <p>{userName}</p>
                </div>
                <Image
                  unoptimized
                  priority
                  src={ArrowDropdown}
                  alt="Profile arrow drop down icon"
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40 max-w-none divide-y">
              {!pathname.startsWith("/ops/") && (
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={() => {
                    setIsProfileOpen(true);
                  }}
                >
                  <PeopleIcon fill="#969696" />
                  <span>My Profile</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <SignOutIcon fill="#969696" />
                <p>Sign out</p>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div
          className={`nav-link lg:hidden ${pathname.startsWith("/ops/") ? "hidden" : ""}`}
          onClick={() => {
            setIsProfileOpen(true);
          }}
        >
          <PeopleIcon fill="#969696" />
          <span>My profile</span>
        </div>

        <div className="nav-link lg:hidden" onClick={() => signOut({ callbackUrl: "/login" })}>
          <SignOutIcon fill="#969696" />
          <p>Sign out</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background-secondary">
        <div className="container space-y-4 px-4 pt-2 lg:px-8">
          <div className="flex flex-col items-center justify-between lg:flex-row">
            <div className="flex w-full flex-row items-center justify-between px-3 py-2 lg:py-0">
              <Link href="#" className="text-2xl text-shamiri-new-blue">
                Shamiri Hub
              </Link>
              <div className="relative lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Toggle navigation"
                      className="bg-white"
                    >
                      <Menu className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[80vw]">
                    <DropdownMenuLabel>
                      <div className="flex justify-between px-2">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-8 w-8">
                            {avatarUrl ? (
                              <AvatarImage src={avatarUrl} width={32} height={32} />
                            ) : null}
                            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                          </Avatar>
                          <p className="text-base text-muted-foreground">{userName}</p>
                        </div>
                        <div className="nav-link">
                          <NotificationIcon />
                          {/*TODO: notification counter */}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {renderNavigationLinks("flex flex-col py-2")}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="hidden shrink-0 py-2 lg:flex">
              {renderNavigationLinks("flex flex-row items-center gap-8")}
            </div>
          </div>
          <div className="no-scrollbar flex items-center gap-8 overflow-x-auto px-2">
            {mainRoute &&
              getCurrentUserNavigationLinks(mainRoute, {
                scheduleActive: scheduleActive ?? false,
                schoolsActive: schoolsActive ?? false,
                supervisorsActive: supervisorsActive ?? false,
                fellowsActive: fellowsActive ?? false,
                studentsActive: studentsActive ?? false,
                clinicalActive: clinicalActive ?? false,
                reportingActive: reportingActive ?? false,
                popoverOpen: popoverOpen,
                setPopoverOpen: setPopoverOpen,
              })}
          </div>
        </div>
      </header>
      <main className="flex grow items-stretch overflow-x-hidden bg-background-secondary">
        {children}
      </main>
      <ProfileDialog isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} profile={profile} />
    </div>
  );
}

function PersonnelToolPopover({ children }: { children: React.ReactNode }) {
  if (APP_ENV !== "testing" && constants.NEXT_PUBLIC_ENV === "production") {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent className="-m-px p-0 shadow-none" align="start">
        <PersonnelTool />
      </PopoverContent>
    </Popover>
  );
}

function getInitials(name: string) {
  if (name === "N/A") {
    return "N/A";
  }
  const nameArray = name.split(" ");
  const firstNameIn = nameArray[0]?.charAt(0).toUpperCase();
  const lastNameIn = nameArray[nameArray.length - 1]?.charAt(0).toUpperCase();

  if (firstNameIn && lastNameIn) {
    return firstNameIn + lastNameIn;
  }

  if (firstNameIn) {
    return firstNameIn;
  }

  return "N/A";
}

function ReportingDropdown({
  popoverOpen,
  setPopoverOpen,
  mainRoute,
}: {
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean) => void;
  mainRoute: string;
}) {
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger className="flex cursor-pointer items-center space-x-1">
        <BarChartIcon />
        <p>Reporting</p>
        <Image
          unoptimized
          priority
          src={ArrowDropdown}
          alt="Drop down Icon"
          className="cursor-pointer"
        />
      </PopoverTrigger>
      <PopoverContent className="absolute min-w-44 space-y-2 rounded-md  bg-white p-2 shadow-md">
        <Link
          href={`/${mainRoute}/reporting/expenses/fellows`}
          className="block px-4 py-2 hover:bg-gray-200"
        >
          Expenses
        </Link>
        <Link
          href={`/${mainRoute}/reporting/school-reports`}
          className="block px-4 py-2 hover:bg-gray-200"
        >
          School Reports
        </Link>
        <Link
          href={`/${mainRoute}/reporting/fellow-reports`}
          className="block px-4 py-2 hover:bg-gray-200"
        >
          Fellow Reports
        </Link>
        {mainRoute === "sc" ? (
          <Link
            className="block px-4 py-2 hover:bg-gray-200"
            href={`/${mainRoute}/reporting/monitoring-and-evaluation`}
          >
            Monitoring and Evaluation Report
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function getCurrentUserNavigationLinks(
  mainRoute: string,
  {
    scheduleActive,
    schoolsActive,
    supervisorsActive,
    fellowsActive,
    studentsActive,
    clinicalActive,
    reportingActive,
    popoverOpen,
    setPopoverOpen,
  }: NavigationLinkProps,
) {
  const links = [];

  // Hub Coordinator links
  if (mainRoute === "hc") {
    links.push(
      <div className={`tab-link ${cn(scheduleActive && "active")}`} key="hc-schedule">
        <CalendarIcon />
        <Link href={`/${mainRoute}/schedule`}>Schedule</Link>
      </div>,
      <div className={`tab-link ${cn(schoolsActive && "active")}`} key="hc-schools">
        <SchoolIcon />
        <Link href={`/${mainRoute}/schools`}>Schools</Link>
      </div>,
      <div className={`tab-link ${cn(supervisorsActive && "active")}`} key="hc-supervisors">
        <PeopleIcon />
        <Link href={`/${mainRoute}/supervisors`}>Supervisors</Link>
      </div>,
      <div className={`tab-link ${cn(fellowsActive && "active")}`} key="hc-fellows">
        <PeopleIconAlternate />
        <Link href={`/${mainRoute}/fellows`}>Fellows</Link>
      </div>,
      <div className={`tab-link ${cn(studentsActive && "active")}`} key="hc-students">
        <GraduationCapIcon />
        <Link href={`/${mainRoute}/students`}>Students</Link>
      </div>,
    );
  }

  // Supervisor links
  if (mainRoute === "sc") {
    links.push(
      <div className={`tab-link ${cn(scheduleActive && "active")}`} key="sc-schedule">
        <CalendarIcon />
        <Link href={`/${mainRoute}/schedule`}>Schedule</Link>
      </div>,
      <div className={`tab-link ${cn(schoolsActive && "active")}`} key="sc-schools">
        <SchoolIcon />
        <Link href={`/${mainRoute}/schools`}>Schools</Link>
      </div>,
      <div className={`tab-link ${cn(fellowsActive && "active")}`} key="sc-fellows">
        <PeopleIconAlternate />
        <Link href={`/${mainRoute}/fellows`}>Fellows</Link>
      </div>,
      <div className={`tab-link ${cn(studentsActive && "active")}`} key="sc-students">
        <GraduationCapIcon />
        <Link href={`/${mainRoute}/students`}>Students</Link>
      </div>,
      <div className={`tab-link ${cn(clinicalActive && "active")}`} key="sc-clinical">
        <PeopleIcon />
        <Link href={`/${mainRoute}/clinical`}>Clinical cases</Link>
      </div>,
    );
  }

  // Fellow links
  if (mainRoute === "fel") {
    links.push(
      <div className={`tab-link ${cn(scheduleActive && "active")}`} key="fel-schedule">
        <CalendarIcon />
        <Link href={`/${mainRoute}/schedule`}>Schedule</Link>
      </div>,
      <div className={`tab-link ${cn(schoolsActive && "active")}`} key="fel-schools">
        <SchoolIcon />
        <Link href={`/${mainRoute}/schools`}>Schools</Link>
      </div>,
      <div className={`tab-link ${cn(studentsActive && "active")}`} key="fel-portal">
        <PeopleIconAlternate />
        <Link href={`/${mainRoute}/portal`}>Fellow portal</Link>
      </div>,
    );
  }

  // Clinical Lead links
  if (mainRoute === "cl" || mainRoute === "ct") {
    links.push(
      <div key="cl-supervisors" className={`tab-link ${cn(supervisorsActive && "active")}`}>
        <PeopleIcon />
        <Link href={`/${mainRoute}/supervisors`}>Supervisors</Link>
      </div>,
      <div key="cl-fellows" className={`tab-link ${cn(fellowsActive && "active")}`}>
        <PeopleIconAlternate />
        <Link href={`/${mainRoute}/fellows`}>Fellows</Link>
      </div>,
      <div key="cl-students" className={`tab-link ${cn(studentsActive && "active")}`}>
        <GraduationCapIcon />
        <Link href={`/${mainRoute}/students`}>Students</Link>
      </div>,
      <div key="cl-clinical" className={`tab-link ${cn(clinicalActive && "active")}`}>
        <PeopleIcon />
        <Link href={`/${mainRoute}/clinical`}>Clinical cases</Link>
      </div>,
    );
  }

  // Add reporting to all roles except for fellows AND clinical leads
  if (mainRoute !== "fel" && mainRoute !== "cl" && mainRoute !== "ct") {
    links.push(
      <div className={`tab-link ${reportingActive ? "active" : ""}`} key="report">
        <ReportingDropdown
          popoverOpen={popoverOpen}
          setPopoverOpen={setPopoverOpen}
          mainRoute={mainRoute ?? ""}
        />
      </div>,
    );
  }

  return links;
}
