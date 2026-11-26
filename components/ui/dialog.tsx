"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type * as React from "react";
import { createContext, use, useRef, useTransition } from "react";

import { toastOnFailure } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

type DialogSave = {
  isSaving: boolean;
  save: (work: () => Promise<unknown>) => void;
};

const DialogSaveContext = createContext<DialogSave | null>(null);

/**
 * Until the work passed to `useDialogSave().save` settles the dialog cannot be closed: Escape, a
 * click outside, the close button and `DialogClose` all do nothing, because closing would hide the
 * outcome of a write that still lands, and reopening could send it again. The work closes the
 * dialog itself once it succeeds.
 */
function Dialog({ onOpenChange, ...props }: DialogPrimitive.Root.Props) {
  const [isSaving, startSaving] = useTransition();
  const save = (work: () => Promise<unknown>) => startSaving(() => toastOnFailure(work));
  return (
    <DialogSaveContext value={{ isSaving, save }}>
      <DialogPrimitive.Root
        onOpenChange={(open, eventDetails) => {
          if (isSaving && !open) {
            eventDetails.cancel();
            return;
          }
          onOpenChange?.(open, eventDetails);
        }}
        {...props}
      />
    </DialogSaveContext>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

/**
 * The save of a form inside `Dialog`. `save` runs the work in a transition and toasts a failure.
 */
function useDialogSave() {
  const dialogSave = use(DialogSaveContext);
  if (!dialogSave) throw new Error("useDialogSave is only available inside Dialog");
  return dialogSave;
}

function DialogClose({ disabled, ...props }: DialogPrimitive.Close.Props) {
  const isSaving = use(DialogSaveContext)?.isSaving ?? false;
  return <DialogPrimitive.Close disabled={disabled || isSaving} {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: Omit<DialogPrimitive.Backdrop.Props, "className"> & { className?: string }) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: Omit<DialogPrimitive.Popup.Props, "className" | "initialFocus" | "finalFocus"> & {
  className?: string;
}) {
  const openerRef = useRef<HTMLElement | null>(null);
  const isSaving = use(DialogSaveContext)?.isSaving ?? false;
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto py-4">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:motion-safe:zoom-out-95 data-open:motion-safe:zoom-in-95 sm:rounded-lg",
            className,
          )}
          initialFocus={() => {
            // A menu item that opens a dialog is gone once the menu closes; use the menu's button.
            const focused = document.activeElement;
            const menuButtonId = focused?.closest("[role=menu]")?.getAttribute("aria-labelledby");
            const opener = menuButtonId ? document.getElementById(menuButtonId) : focused;
            openerRef.current = opener instanceof HTMLElement ? opener : null;
            return true;
          }}
          // A dialog opened from state has no trigger to return focus to.
          finalFocus={() => (openerRef.current?.isConnected ? openerRef.current : true)}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            disabled={isSaving}
            className="absolute right-2 top-2 rounded-sm p-2 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-30"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPortal>
  );
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

function DialogTitle({
  className,
  ...props
}: Omit<DialogPrimitive.Title.Props, "className"> & { className?: string }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-xl leading-7", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: Omit<DialogPrimitive.Description.Props, "className"> & { className?: string }) {
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
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  useDialogSave,
};
