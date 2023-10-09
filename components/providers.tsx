"use client";

import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import * as React from "react";

import { ThemeProvider } from "#/components/theme-provider";
import { TooltipProvider } from "#/components/ui/tooltip";
import { Toaster } from "sonner";

export function Providers({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          {children}
          <Toaster closeButton />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
