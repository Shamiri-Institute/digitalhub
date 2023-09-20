"use client";

import * as React from "react";

import { TooltipProvider } from "#/components/ui/tooltip";
import { ThemeProvider } from "#/components/theme-provider";
import { SessionProvider } from "#/components/session-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
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
