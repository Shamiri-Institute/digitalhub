"use client";

import type * as React from "react";
import { I18nProvider } from "react-aria";

import { Toaster } from "#/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="en-KE">
      {children}
      <Toaster />
    </I18nProvider>
  );
}
