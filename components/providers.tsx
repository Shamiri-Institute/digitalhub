"use client";

import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import * as React from "react";

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
      <TooltipProvider>
        {children}
        <Toaster closeButton />
      </TooltipProvider>
    </SessionProvider>
  );
}
