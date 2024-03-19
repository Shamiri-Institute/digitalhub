"use client";

import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import * as React from "react";
import { I18nProvider } from "react-aria";

import { Toaster } from "#/components/ui/toaster";
import { TooltipProvider } from "#/components/ui/tooltip";

export function Providers({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <I18nProvider locale="en-KE">
      <SessionProvider session={session}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </SessionProvider>
    </I18nProvider>
  );
}
