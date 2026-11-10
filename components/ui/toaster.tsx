"use client";

import dynamic from "next/dynamic";

// Base UI's toast code is about 26 KB gzipped and most pages never show a toast, so it loads
// after the page instead of with it.
export const Toaster = dynamic(
  () => import("#/components/ui/toast-viewport").then((mod) => mod.ToastViewport),
  { ssr: false },
);
