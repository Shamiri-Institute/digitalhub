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

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/hc")) {
    return <LayoutV2>{children}</LayoutV2>;
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

function LayoutV2({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-background-secondary">
        <div className="flex items-center justify-between px-4">
          <div className="px-3">
            <Link href="#" className="text-xl text-shamiri-new-blue">
              Shamiri Hub
            </Link>
          </div>
          <div className="flex items-center">
            <PersonnelToolPopover>
              <div className="mr-8 text-shamiri-new-blue">Switch Role</div>
            </PersonnelToolPopover>
            <div className="mr-8 flex items-center gap-2 py-2">
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
            <div className="mr-8 flex items-center gap-2 py-2">
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
            <div className="flex items-center gap-6">
              <Image
                unoptimized
                priority
                src={NotificationIcon}
                alt="Notification Icon"
                width={24}
                height={24}
              />
              {/*TODO: notification counter */}
              <div className="flex space-x-2">
                {/* TODO: figure out which parts of the component should be clickable */}
                <div>{/* TODO: avatar icon */}A</div>
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
          <div className="flex gap-2 py-2">
            <Image
              unoptimized
              priority
              src={CalendarIcon}
              alt="Schedule Icon"
            />
            <Link href="/hc/schedule">Schedule</Link>
          </div>
          <div className="flex gap-2 py-2">
            <Image unoptimized priority src={SchoolIcon} alt="School Icon" />
            <Link href="/hc/schools">Schools</Link>
          </div>
          <div className="flex gap-2 py-2">
            <Image
              unoptimized
              priority
              src={PeopleIcon}
              alt="Supervisors Icon"
            />
            <Link href="/hc/supervisors">Supervisors</Link>
          </div>
          <div className="flex gap-2 py-2">
            <Image
              unoptimized
              priority
              src={PeopleIconAlternate}
              alt="Fellow Icon"
            />
            <Link href="/hc/fellows">Fellows</Link>
          </div>
          <div className="flex gap-2 py-2">
            <Image
              unoptimized
              priority
              src={GraduationCapIcon}
              alt="Students icon"
            />
            <Link href="/hc/students">Students</Link>
          </div>
          <div className="flex gap-2 py-2">
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
