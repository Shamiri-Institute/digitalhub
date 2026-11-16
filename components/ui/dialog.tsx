"use client";

import type { Dialog as DialogParts } from "@base-ui/react/dialog";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { X } from "lucide-react";
import type * as React from "react";
import { createContext, use, useEffect, useRef, useTransition } from "react";

import { afterPage, type StandIn, useStandIn } from "#/components/deferred";
import { useHoldMenuOpen } from "#/components/ui/dropdown-menu";
import { toastOnFailure } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

type DialogSave = {
  isSaving: boolean;
  save: (work: () => Promise<unknown>) => void;
};

const DialogSaveContext = createContext<DialogSave | null>(null);

// Base UI's Dialog brings focus trapping and positioning code that a page needs only once a dialog
// opens, so it loads on the first interaction like menus and selects. A dialog's own trigger is
// drawn as a stand-in until then, and a press on it opens the dialog once the code arrives.
const [useDialogCode, loadDialogCode] = afterPage(() =>
  import("@base-ui/react/dialog").then((mod) => mod.Dialog),
);

const DialogCode = createContext<({ Parts: typeof DialogParts | null } & StandIn) | null>(null);

function useDialogCodeContext() {
  const context = use(DialogCode);
  if (!context) throw new Error("Dialog parts must be inside <Dialog>");
  return context;
}

// Inside an open popup, which only renders once the code has loaded.
function useLoadedDialog() {
  const { Parts } = useDialogCodeContext();
  if (!Parts) throw new Error("A dialog part rendered before the dialog's code loaded");
  return Parts;
}

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
}: Omit<DialogParts.Root.Props, "children"> & { children?: React.ReactNode }) {
  const Parts = useDialogCode();
  const standIn = useStandIn(loadDialogCode);
  const [isSaving, startSaving] = useTransition();
  const save = (work: () => Promise<unknown>) => startSaving(() => toastOnFailure(work));
  const isOpen = Boolean(props.open);
  // effect: a dialog opened before the visitor's first interaction fetches its code at once
  useEffect(() => {
    if (isOpen) void loadDialogCode();
  }, [isOpen]);
  const content = <DialogSaveContext value={{ isSaving, save }}>{children}</DialogSaveContext>;
  return (
    <DialogCode value={{ Parts, ...standIn }}>
      {Parts ? (
        <Parts.Root
          {...props}
          onOpenChange={(open, details) => {
            if (!open && isSaving) {
              details.cancel();
              return;
            }
            onOpenChange?.(open, details);
          }}
        >
          {content}
        </Parts.Root>
      ) : (
        content
      )}
    </DialogCode>
  );
}

// Only what a plain button also takes, so the stand-in draws the same element.
type TriggerProps = Omit<React.ComponentProps<"button">, "ref"> & {
  render?: React.ReactElement;
};

function DialogTrigger(props: TriggerProps) {
  const { Parts, standInHandlers, takeOver } = useDialogCodeContext();
  if (!Parts) return <StandInTrigger {...props} handlers={standInHandlers} />;
  return <Parts.Trigger {...props} ref={takeOver} />;
}

function StandInTrigger({
  render,
  handlers,
  ...props
}: TriggerProps & { handlers: StandIn["standInHandlers"] }) {
  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      { type: "button", "aria-haspopup": "dialog", "aria-expanded": false },
      props,
      handlers,
    ),
  });
}

function DialogClose({ disabled, ...props }: DialogParts.Close.Props) {
  const Parts = useLoadedDialog();
  const isSaving = use(DialogSaveContext)?.isSaving ?? false;
  return <Parts.Close disabled={disabled || isSaving} {...props} />;
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
}: DialogParts.Popup.Props) {
  const { Parts } = useDialogCodeContext();
  const openerRef = useRef<() => HTMLElement | true>(() => true);
  const isSaving = use(DialogSaveContext)?.isSaving ?? false;
  const holdMenuOpen = useHoldMenuOpen();
  if (!Parts) return null;
  return (
    <Parts.Portal>
      <Parts.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-navy/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <Parts.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto py-4">
        <Parts.Popup
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
          <Parts.Close
            disabled={isSaving}
            className="absolute right-2 top-2 rounded-sm p-2 opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Parts.Close>
        </Parts.Popup>
      </Parts.Viewport>
    </Parts.Portal>
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

function DialogTitle({ className, ...props }: DialogParts.Title.Props) {
  const Parts = useLoadedDialog();
  return (
    <Parts.Title
      data-slot="dialog-title"
      className={cn("text-lg font-bold leading-tight text-primary", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogParts.Description.Props) {
  const Parts = useLoadedDialog();
  return (
    <Parts.Description
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
