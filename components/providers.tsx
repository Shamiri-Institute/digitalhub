"use client";

import * as React from "react";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { TooltipProvider } from "#/components/ui/tooltip";
import { ThemeProvider } from "#/components/theme-provider";
import { Toaster } from "#/components/ui/toaster";

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
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
