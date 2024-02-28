"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { Footer } from "#/components/footer";
import { Header } from "#/components/header";
import { Icons } from "#/components/icons";
import { Navigation } from "#/components/navigation";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ArrowDropdown from "../public/icons/arrow-drop-down.svg";
import FeedbackIcon from "../public/icons/feedback-icon.svg";
import HelpIcon from "../public/icons/help-icon.svg";
import NotificationIcon from "../public/icons/notification-icon.svg";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/hc")) {
    return (
      <>
        <header className="flex justify-between px-4">
          <a>Shamiri Hub</a>
          <div className="flex">
            <div className="mr-8 flex items-center gap-2">
              <Image
                unoptimized
                priority
                src={FeedbackIcon}
                alt="Feedback Icon"
                width={24}
                heigh={24}
              />
              <a>Feedback</a>
            </div>
            <div className="mr-8 flex items-center gap-2">
              <Image
                unoptimized
                priority
                src={HelpIcon}
                alt="Help Icon"
                width={24}
                height={24}
              />
              <a>Help</a>
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
