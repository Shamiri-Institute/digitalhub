"use client";

import { Toast } from "@base-ui/react/toast";
import { CircleAlert, X } from "lucide-react";

import { toastManager } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const destructive = toast.type === "destructive";
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        role="status"
        className={cn(
          "pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border bg-white p-4 pr-10 text-foreground shadow-md transition-[opacity,translate] duration-200 data-ending-style:opacity-0 data-limited:hidden data-starting-style:translate-y-2 data-starting-style:opacity-0",
          destructive && "border-destructive-border bg-destructive-bg text-destructive",
        )}
      >
        {destructive && <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
        <div className="grid flex-1 gap-1">
          <Toast.Title className="text-sm font-semibold" />
          <Toast.Description className="text-sm" />
        </div>
        <Toast.Action className="inline-flex h-8 shrink-0 items-center rounded-md border border-current/30 px-3 text-sm font-semibold hover:bg-black/5" />
        <Toast.Close
          aria-label="Close"
          className="absolute right-2 top-2 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </Toast.Close>
      </Toast.Root>
    );
  });
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} limit={1}>
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 right-1/2 z-100 flex w-[calc(100%-2rem)] translate-x-1/2 flex-col gap-2 sm:right-4 sm:translate-x-0 md:max-w-[420px]">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
