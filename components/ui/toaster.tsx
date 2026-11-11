"use client";

import { createElement } from "react";

import { afterPage } from "#/components/deferred";
import { whenToastWaits } from "#/components/ui/use-toast";

// Base UI's toast code is not needed until a toast is shown, so it loads on the first toast or the
// first interaction, whichever comes first.
const [useToastViewport, loadToastViewport] = afterPage(() =>
  import("#/components/ui/toast-viewport").then((mod) => mod.ToastViewport),
);
whenToastWaits(() => void loadToastViewport());

export function Toaster() {
  // The same module-level component on every render once loaded, not one made here.
  const toastViewport = useToastViewport();
  return toastViewport ? createElement(toastViewport) : null;
}
