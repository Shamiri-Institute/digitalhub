"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { Footer } from "#/components/footer";
import { Header } from "#/components/header";
import { Icons } from "#/components/icons";
import { Navigation } from "#/components/navigation";
import { AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ArrowDropdown from "../public/icons/arrow-drop-down.svg";
import BarchartIcon from "../public/icons/bar-chart-icon.svg";
import CalendarIcon from "../public/icons/calendar-icon.svg";
import FeedbackIcon from "../public/icons/feedback-icon.svg";
import GraduationCapIcon from "../public/icons/graduation-cap-icon.svg";
import HelpIcon from "../public/icons/help-icon.svg";
import NotificationIcon from "../public/icons/notification-icon.svg";
import PeopleIconAlternate from "../public/icons/people-icon-alternate.svg";
import PeopleIcon from "../public/icons/people-icon.svg";
import SchoolIcon from "../public/icons/school-icon.svg";
import { Avatar } from "./ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // TODO: need to ensure that this screens for other prefix routes e.g. /op /sc etc
  if (pathname.startsWith("/hc")) {
    return (
      <>
        <header className="bg-background-secondary">
          <div className="flex items-center justify-between px-4">
            <div className="px-3">
              <Link href="#" className="text-xl text-shamiri-new-blue">
                Shamiri Hub
              </Link>
            </div>
            <div className="flex">
              <div className="mr-8 flex flex-none items-center gap-2 py-2">
                <Image
                  unoptimized
                  priority
                  src={FeedbackIcon}
                  alt="Feedback Icon"
                  width={24}
                  height={24}
                />
                <Link href="#">Feedback</Link>
              </div>
              <div className="mr-8 flex flex-none items-center gap-2 py-2">
                <Image
                  unoptimized
                  priority
                  src={HelpIcon}
                  alt="Help Icon"
                  width={24}
                  height={24}
                />
                <Link href="#">Help</Link>
              </div>
              <div className="flex flex-none items-center gap-6">
                <div className="relative">
                  <Image
                    unoptimized
                    priority
                    src={NotificationIcon}
                    alt="Notification Icon"
                    width={24}
                    height={24}
                  />
                  <span className="absolute -end-[6px] -top-[1px] rounded-[96px] bg-shamiri-light-red px-1 text-[10px] text-white">
                    12
                  </span>
                </div>
                <div className="flex flex-none items-center gap-2">
                  {/* TODO: figure out which parts of the component should be clickable */}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://avatars.githubusercontent.com/u/140525342?s=200&v=4" />
                    <AvatarFallback>SI</AvatarFallback>
                  </Avatar>
                  <p>Leroy Jenkins</p>
                  <Image
                    unoptimized
                    priority
                    src={ArrowDropdown}
                    alt="Profile/Setting arrow drop down icon"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="no-scrollbar flex gap-8 overflow-x-auto px-6">
            {/*TODO: the items in this list should depend on the user's role */}
            <div className="flex flex-none items-center gap-2 py-2">
              <Image
                unoptimized
                priority
                src={CalendarIcon}
                alt="Schedule Icon"
              />
              <Link href="/hc/schedule">Schedule</Link>
            </div>
            <div className="flex flex-none items-center gap-2 py-2">
              <Image unoptimized priority src={SchoolIcon} alt="School Icon" />
              <Link href="/hc/schools">Schools</Link>
            </div>
            <div className="flex flex-none items-center gap-2 py-2">
              <Image
                unoptimized
                priority
                src={PeopleIcon}
                alt="Supervisors Icon"
              />
              <Link href="/hc/supervisors">Supervisors</Link>
            </div>
            <div className="flex flex-none items-center gap-2 py-2">
              <Image
                unoptimized
                priority
                src={PeopleIconAlternate}
                alt="Fellow Icon"
              />
              <Link href="/hc/fellows">Fellows</Link>
            </div>
            <div className="flex flex-none items-center gap-2 py-2">
              <Image
                unoptimized
                priority
                src={GraduationCapIcon}
                alt="Students icon"
              />
              <Link href="/hc/students">Students</Link>
            </div>
            <div className="flex flex-none items-center gap-2 py-2">
              <Image
                unoptimized
                priority
                src={BarchartIcon}
                alt="Reporting icon"
              />
              <Link href="/hc/reporting">Reporting</Link>
              <Image
                unoptimized
                priority
                src={ArrowDropdown}
                alt="Drop down Icon"
              />
            </div>
          </div>
        </header>
        {children}
      </>
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
