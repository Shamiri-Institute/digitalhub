"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type * as React from "react";
import { createContext, use, useRef, useTransition } from "react";

import { toastOnFailure } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

type DialogSave = {
  isSaving: boolean;
  save: (work: () => Promise<unknown>) => void;
};

const DialogSaveContext = createContext<DialogSave | null>(null);

/**
 * The save of a form inside `DialogContent`. `save` runs the work in a transition and toasts a
 * failure. Until the work settles the dialog cannot be closed: Escape, a click outside, the close
 * button and `DialogClose` all do nothing, because closing would hide the outcome of a write that
 * still lands, and reopening could send it again. The work closes the dialog itself once it
 * succeeds.
 */
function useDialogSave() {
  const dialogSave = use(DialogSaveContext);
  if (!dialogSave) throw new Error("useDialogSave is only available inside DialogContent");
  return dialogSave;
}

function DialogClose({ disabled, ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const isSaving = use(DialogSaveContext)?.isSaving ?? false;
  return <DialogPrimitive.Close disabled={disabled || isSaving} {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 py-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const openerRef = useRef<HTMLElement | null>(null);
  const [isSaving, startSaving] = useTransition();
  const save = (work: () => Promise<unknown>) => startSaving(() => toastOnFailure(work));
  return (
    <DialogPortal>
      <DialogOverlay>
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:motion-safe:zoom-out-95 data-[state=open]:motion-safe:zoom-in-95 sm:rounded-lg",
            className,
          )}
          onOpenAutoFocus={(event) => {
            // A menu item that opens a dialog is gone once the menu closes; use the menu's button.
            const focused = document.activeElement;
            const menuButtonId = focused?.closest("[role=menu]")?.getAttribute("aria-labelledby");
            const opener = menuButtonId ? document.getElementById(menuButtonId) : focused;
            openerRef.current = opener instanceof HTMLElement ? opener : null;
            onOpenAutoFocus?.(event);
          }}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            if (event.defaultPrevented) return;
            const opener = openerRef.current;
            // Radix's own handler runs next and focuses the DialogTrigger. A dialog opened from state
            // has none, so focus falls to body.
            queueMicrotask(() => {
              if (document.activeElement === document.body) opener?.focus();
            });
          }}
          onEscapeKeyDown={(event) => {
            if (isSaving) event.preventDefault();
            onEscapeKeyDown?.(event);
          }}
          onInteractOutside={(event) => {
            if (isSaving) event.preventDefault();
            onInteractOutside?.(event);
          }}
          {...props}
        >
          <DialogSaveContext value={{ isSaving, save }}>{children}</DialogSaveContext>
          <DialogPrimitive.Close
            disabled={isSaving}
            className="absolute right-2 top-2 rounded-sm p-2 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-30 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogOverlay>
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

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
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
