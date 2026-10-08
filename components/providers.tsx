"use client";

import type * as React from "react";
import { I18nProvider } from "react-aria";

import { Toaster } from "#/components/ui/toaster";
import { TooltipProvider } from "#/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="en-KE">
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </I18nProvider>
  );
}
