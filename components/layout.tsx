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
import { constants } from "#/lib/constants";
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
} from "./ui/layout-icons";

import { cn } from "#/lib/utils";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useSession();

  if (pathname.startsWith("/hc")) {
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
  const [, subRoute] = pathname.slice(1).split("/"); // get the path under the 'hc' route. fix this when we add other roles
  const schoolsActive = subRoute?.includes("schools");
  const scheduleActive = subRoute?.includes("schedule");
  const supervisorsActive = subRoute?.includes("supervisor");
  const fellowsActive = subRoute?.includes("fellow");
  const studentsActive = subRoute?.includes("student");
  const reportingActive = subRoute?.includes("reporting");

  const activeColor = "#0085FF";
  const inactiveColour = "#969696";

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
                <Popover>
                  <PopoverTrigger>
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
                  </PopoverTrigger>
                  <PopoverContent>
                    <button
                      className="flex items-center gap-3"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M10.0001 2.5C9.54173 2.5 9.16673 2.875 9.16673 3.33333V10C9.16673 10.4583 9.54173 10.8333 10.0001 10.8333C10.4584 10.8333 10.8334 10.4583 10.8334 10V3.33333C10.8334 2.875 10.4584 2.5 10.0001 2.5ZM14.2834 4.88333C13.9584 5.20833 13.9667 5.71667 14.2751 6.04167C15.2167 7.04167 15.8001 8.375 15.8334 9.85C15.9084 13.0417 13.2667 15.7917 10.0751 15.825C6.81673 15.875 4.16673 13.25 4.16673 10C4.16673 8.46667 4.7584 7.075 5.72506 6.03333C6.0334 5.70833 6.0334 5.2 5.71673 4.88333C5.3834 4.55 4.84173 4.55833 4.52506 4.9C3.31673 6.18333 2.5584 7.89167 2.50006 9.78333C2.3834 13.85 5.69173 17.3667 9.7584 17.4917C14.0084 17.625 17.5001 14.2167 17.5001 9.99167C17.5001 8.01667 16.7334 6.23333 15.4834 4.9C15.1667 4.55833 14.6167 4.55 14.2834 4.88333Z"
                          fill="#969696"
                        />
                      </svg>
                      <p>Sign out</p>
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="no-scrollbar flex items-center gap-8 overflow-x-auto px-2">
            {/*TODO: the items in this list should depend on the user's role */}
            <div className={`tab-link ${cn(scheduleActive && "active")}`}>
              <CalendarIcon />
              <Link href="/hc/schedule">Schedule</Link>
            </div>
            <div className={`tab-link ${cn(schoolsActive && "active")}`}>
              <SchoolIcon />
              <Link href="/hc/schools">Schools</Link>
            </div>
            <div className={`tab-link ${cn(supervisorsActive && "active")}`}>
              <PeopleIcon />
              <Link href="/hc/supervisors">Supervisors</Link>
            </div>
            <div className={`tab-link ${cn(fellowsActive && "active")}`}>
              <PeopleIconAlternate />
              <Link href="/hc/fellows">Fellows</Link>
            </div>
            <div className={`tab-link ${cn(studentsActive && "active")}`}>
              <GraduationCapIcon />
              <Link href="/hc/students">Students</Link>
            </div>
            <div className={`tab-link ${cn(reportingActive && "active")}`}>
              <BarChartIcon />
              <Link href="/hc/reporting">Reporting</Link>
              <Image
                unoptimized
                priority
                src={ArrowDropdown}
                alt="Drop down Icon"
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
  if (constants.NEXT_PUBLIC_ENV === "production") {
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
