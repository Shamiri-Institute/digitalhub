"use client";

import * as React from "react";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { TooltipProvider } from "#/components/ui/tooltip";
import { ThemeProvider } from "#/components/theme-provider";

export function Providers({
  session,
  children,
}: {
  session: Session;
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
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
