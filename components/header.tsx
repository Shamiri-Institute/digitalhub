import { motion } from "framer-motion";
import Link from "next/link";
import { forwardRef } from "react";

import { Icons } from "#/components/icons";
import { MobileNavigation } from "#/components/mobile-navigation";
import { cn } from "#/lib/utils";

export const Header = forwardRef<
  React.ElementRef<"div">,
  { className?: string }
>(function Header({ className }, ref) {
  return (
    <motion.div
      ref={ref}
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-12 px-4 transition sm:px-6 lg:left-72 lg:z-30 lg:hidden lg:px-8 xl:left-80",
        "bg-background",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-full h-px bg-border/50 transition",
        )}
      />
      <div className="search-placeholder hidden lg:block lg:max-w-md lg:flex-auto"></div>
      <div className="flex items-center gap-5 lg:hidden">
        <MobileNavigation />
        <Link href="/" aria-label="Home">
          <Icons.logo className="h-6" />
        </Link>
      </div>
      <div className="flex items-center gap-5">
        <div className="hidden md:block md:h-5 md:w-px md:bg-border" />
      </div>
    </motion.div>
  );
});
