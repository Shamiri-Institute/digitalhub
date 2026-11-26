"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";

import { toastManager } from "#/components/ui/use-toast";

const toastVariants = cva(
  "group absolute inset-x-0 top-0 flex w-full items-center justify-between gap-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-[transform,opacity] duration-300 [transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--toast-swipe-movement-y))] data-limited:opacity-0 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-safe:data-starting-style:[transform:translateY(-100%)] sm:top-auto sm:bottom-0 sm:motion-safe:data-starting-style:[transform:translateY(100%)] motion-safe:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+100%))]",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      swipeDirection="right"
      // The viewport's live region announces the toast; it is not a dialog to the page.
      render={({ role: _dialogRole, "aria-modal": _modal, ...props }) => <section {...props} />}
      data-slot="toast"
      className={toastVariants({
        variant: toast.type === "destructive" ? "destructive" : "default",
      })}
    >
      <div className="grid gap-1">
        {toast.title && <ToastPrimitive.Title className="text-sm font-semibold [&+p]:text-xs" />}
        {toast.description && <ToastPrimitive.Description className="text-sm opacity-90" />}
      </div>
      {toast.actionProps && (
        <ToastPrimitive.Action className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-hidden focus:ring-1 focus:ring-ring group-data-[type=destructive]:border-muted/40 hover:group-data-[type=destructive]:bg-destructive hover:group-data-[type=destructive]:text-destructive-foreground" />
      )}
      <ToastPrimitive.Close
        aria-label="Close"
        className="absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-hidden focus:ring-1 group-hover:opacity-100 group-data-[type=destructive]:text-white/80 hover:group-data-[type=destructive]:text-white"
      >
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ));
}

export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} limit={1}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed right-1/2 top-4 z-100 w-[calc(100%-2rem)] translate-x-1/2 sm:bottom-4 sm:right-4 sm:top-auto sm:translate-x-0 md:max-w-[420px]">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}
