"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { PersonnelTool } from "#/app/dev-personnel-switcher";
import { Footer } from "#/components/footer";
import { Header } from "#/components/header";
import { Icons } from "#/components/icons";
import { Navigation } from "#/components/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { APP_ENV, constants } from "#/lib/constants";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ArrowDropdown from "../public/icons/arrow-drop-down.svg";
import {
  BarChartIcon,
  CalendarIcon,
  FeedbackIcon,
  GraduationCapIcon,
  HelpIcon,
  NotificationIcon,
  PeopleIcon,
  PeopleIconAlternate,
  SchoolIcon,
  SignOutIcon,
} from "./ui/layout-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useSession();

  // TODO: this logic should be made more straightforward
  if (
    pathname.startsWith("/hc/") ||
    pathname.startsWith("/sc/") ||
    pathname.startsWith("/fel/") ||
    pathname.startsWith("/cl/")
  ) {
    return (
      <LayoutV2
        userName={session.data?.user.name ?? "N/A"}
        avatarUrl={session.data?.user.image}
        pathname={pathname}
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
}: {
  children: React.ReactNode;
  userName: string;
  avatarUrl?: string | null;
  pathname: string;
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
  const router = useRouter();

  useEffect(() => {
    setPopoverOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background-secondary">
        <div className="container space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="px-3">
              <Link href="#" className="text-2xl text-shamiri-new-blue">
                Shamiri Hub
              </Link>
            </div>
            <div className="flex items-center gap-8 py-2">
              <PersonnelToolPopover>
                <div className="text-shamiri-new-blue">Switch Role</div>
              </PersonnelToolPopover>
              <div className="nav-link">
                <FeedbackIcon />
                <Link href="#">Feedback</Link>
              </div>
              <div className="nav-link">
                <HelpIcon />
                <Link href="#">Help</Link>
              </div>
              <div className="nav-link">
                <NotificationIcon />
                {/*TODO: notification counter */}
              </div>
              <div className="nav-link">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} width={32} height={32} />
                        ) : null}
                        <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                      </Avatar>
                      <p>{userName}</p>
                      <Image
                        unoptimized
                        priority
                        src={ArrowDropdown}
                        alt="Profile/Setting arrow drop down icon"
                      />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40 max-w-none divide-y">
                    <DropdownMenuItem
                      className="flex items-center gap-2"
                      onClick={() => {
                        router.push(`/${mainRoute}/profile`);
                      }}
                    >
                      <PeopleIcon fill="#969696" />
                      <span>My Profile</span>
                    </DropdownMenuItem>

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
            </div>
          </div>
          <div className="no-scrollbar flex items-center gap-8 overflow-x-auto px-2">
            {/*TODO: the items in this list should depend on the user's role */}
            <div className={`tab-link ${cn(scheduleActive && "active")}`}>
              <CalendarIcon />
              <Link href={`/${mainRoute}/schedule`}>Schedule</Link>
            </div>
            <div className={`tab-link ${cn(schoolsActive && "active")}`}>
              <SchoolIcon />
              <Link href={`/${mainRoute}/schools`}>Schools</Link>
            </div>
            {mainRoute === "hc" ? (
              <div className={`tab-link ${cn(supervisorsActive && "active")}`}>
                <PeopleIcon />
                <Link href={`/${mainRoute}/supervisors`}>Supervisors</Link>
              </div>
            ) : null}
            {(mainRoute === "hc" || mainRoute === "sc") && (
              <>
                <div className={`tab-link ${cn(fellowsActive && "active")}`}>
                  <PeopleIconAlternate />
                  <Link href={`/${mainRoute}/fellows`}>Fellows</Link>
                </div>
                <div className={`tab-link ${cn(studentsActive && "active")}`}>
                  <GraduationCapIcon />
                  <Link href={`/${mainRoute}/students`}>Students</Link>
                </div>
              </>
            )}
            {mainRoute === "fel" && (
              <div className={`tab-link ${cn(studentsActive && "active")}`}>
                <PeopleIconAlternate />
                <Link href={`/${mainRoute}/fellow-portal`}>Fellow portal</Link>
              </div>
            )}
            {(mainRoute === "sc" || mainRoute === "cl") && (
              <div className={`tab-link ${cn(clinicalActive && "active")}`}>
                <PeopleIcon />
                <Link href={`/${mainRoute}/clinical`}>Clinical cases</Link>
              </div>
            )}
            <div className={`tab-link ${reportingActive ? "active" : ""}`}>
              <ReportingDropdown
                popoverOpen={popoverOpen}
                setPopoverOpen={setPopoverOpen}
                mainRoute={mainRoute ?? ""}
              />
            </div>
          </div>
        </div>
      </header>
      <main className="flex grow items-stretch bg-background-secondary">
        {children}
      </main>
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
      <PopoverContent className="-m-px p-0 shadow-none">
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
          href={`/${mainRoute}/reporting`}
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
      </PopoverContent>
    </Popover>
  );
}
