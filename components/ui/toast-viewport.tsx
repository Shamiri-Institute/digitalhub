"use client";

import { Toast } from "@base-ui/react/toast";
import { CircleAlert, X } from "lucide-react";
import { useEffect } from "react";

import { attachToastViewport } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const destructive = toast.type === "destructive";
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- overrides Base UI's role="dialog" on the toast; an <output> would get that role too
        role="status"
        swipeDirection="up"
        className={cn(
          "pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border bg-white p-4 pr-10 text-foreground shadow-md transition-opacity duration-200 data-ending-style:opacity-0 data-limited:hidden data-starting-style:opacity-0",
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

const toastManager = Toast.createToastManager();

export function ToastViewport() {
  // effect: attaches this viewport to the module-level toast queue, an external store
  useEffect(
    () =>
      attachToastViewport(({ title, description, variant = "default", action }) => {
        toastManager.add({
          title,
          description,
          type: variant,
          actionProps: action && { children: action.label, onClick: action.onClick },
        });
      }),
    [],
  );
  return (
    <Toast.Provider toastManager={toastManager} limit={1}>
      <Toast.Portal>
        {/* Top centre, over the header's empty middle: forms keep their Save and Discard in a bar
            along the bottom, which a toast there would cover. */}
        <Toast.Viewport className="fixed left-1/2 top-3 z-100 flex w-[calc(100%-2rem)] -translate-x-1/2 flex-col gap-2 md:max-w-[420px]">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
