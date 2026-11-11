"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type * as React from "react";
import { createContext, use, useRef, useTransition } from "react";

import { useHoldMenuOpen } from "#/components/ui/dropdown-menu";
import { toastOnFailure } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

type DialogSave = {
  isSaving: boolean;
  save: (work: () => Promise<unknown>) => void;
};

const DialogSaveContext = createContext<DialogSave | null>(null);

/**
 * The save of a form inside the dialog. `save` runs the work in a transition and toasts a
 * failure. Until the work settles the dialog cannot be closed: Escape, a click outside, the close
 * button and `DialogClose` all do nothing, because closing would hide the outcome of a write that
 * still lands, and reopening could send it again. The work closes the dialog itself once it
 * succeeds.
 */
function useDialogSave() {
  const dialogSave = use(DialogSaveContext);
  if (!dialogSave) throw new Error("useDialogSave is only available inside a Dialog");
  return dialogSave;
}

function Dialog({
  onOpenChange,
  children,
  ...props
}: Omit<DialogPrimitive.Root.Props, "children"> & { children?: React.ReactNode }) {
  const [isSaving, startSaving] = useTransition();
  const save = (work: () => Promise<unknown>) => startSaving(() => toastOnFailure(work));
  return (
    <DialogPrimitive.Root
      {...props}
      onOpenChange={(open, details) => {
        if (!open && isSaving) {
          details.cancel();
          return;
        }
        onOpenChange?.(open, details);
      }}
    >
      <DialogSaveContext value={{ isSaving, save }}>{children}</DialogSaveContext>
    </DialogPrimitive.Root>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;

function DialogClose({ disabled, ...props }: DialogPrimitive.Close.Props) {
  const isSaving = use(DialogSaveContext)?.isSaving ?? false;
  return <DialogPrimitive.Close disabled={disabled || isSaving} {...props} />;
}

// Where focus returns when the dialog closes: the element that opened it, or, when that was a menu
// item and its menu has closed since, the menu's button.
function openerOf(focused: Element | null) {
  const menu = focused?.closest("[role=menu]");
  const menuButton = menu
    ? (menu.id && document.querySelector(`[aria-controls="${CSS.escape(menu.id)}"]`)) ||
      document.getElementById(menu.getAttribute("aria-labelledby") ?? "")
    : null;
  return () => {
    if (focused instanceof HTMLElement && focused.isConnected) return focused;
    return menuButton instanceof HTMLElement && menuButton.isConnected ? menuButton : true;
  };
}

function DialogContent({
  className,
  children,
  initialFocus,
  finalFocus,
  ...props
}: DialogPrimitive.Popup.Props) {
  const openerRef = useRef<() => HTMLElement | true>(() => true);
  const isSaving = use(DialogSaveContext)?.isSaving ?? false;
  const holdMenuOpen = useHoldMenuOpen();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-navy/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto py-4">
        <DialogPrimitive.Popup
          ref={holdMenuOpen}
          data-slot="dialog-content"
          className={cn(
            "relative grid w-full max-w-lg gap-4 bg-background p-6 shadow-xl transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 sm:rounded-xl",
            className,
          )}
          initialFocus={(openType) => {
            openerRef.current = openerOf(document.activeElement);
            if (typeof initialFocus === "function") return initialFocus(openType);
            if (initialFocus && typeof initialFocus === "object") return initialFocus.current;
            return initialFocus ?? true;
          }}
          finalFocus={finalFocus ?? (() => openerRef.current())}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            disabled={isSaving}
            className="absolute right-2 top-2 rounded-sm p-2 opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-bold leading-tight text-primary", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useDialogSave,
};
