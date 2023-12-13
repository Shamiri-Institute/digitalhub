"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { Footer } from "#/components/footer";
import { Header } from "#/components/header";
import { Icons } from "#/components/icons";
import { Navigation } from "#/components/navigation";

export function Layout({ children }: { children: React.ReactNode }) {
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
      <div className="relative mx-auto flex h-full flex-col px-4 pt-14 sm:px-6 lg:px-8">
        <main className="flex-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
