import { Toast } from "@base-ui/react/toast";
import type * as React from "react";

type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  /** One button in the toast, such as "Reschedule". */
  action?: { label: string; onClick: () => void };
};

/** The one toast store; `<Toaster />` renders it and `toast()` adds to it from anywhere. */
const toastManager = Toast.createToastManager();

function toast({ title, description, variant = "default", action }: ToastOptions) {
  const id = toastManager.add({
    title,
    description,
    type: variant,
    priority: variant === "destructive" ? "high" : "low",
    actionProps: action && { children: action.label, onClick: action.onClick },
  });
  return { id, dismiss: () => toastManager.close(id) };
}

function useToast() {
  return { toast, dismiss: (toastId?: string) => toastManager.close(toastId) };
}

/**
 * Wraps an async event handler so React gets a handler that returns void.
 * A rejection shows a destructive toast and is rethrown, so it still reaches the
 * console in development and Sentry in production as an unhandled rejection.
 */
function toastOnError<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return (...args: A): void => {
    void fn(...args).catch((error: unknown) => {
      toast({ title: "Something went wrong, please try again", variant: "destructive" });
      throw error;
    });
  };
}

/**
 * Runs async work inside `startTransition` without rejecting: React sends an error thrown in a
 * transition to the nearest error boundary. A failure shows a destructive toast and goes to
 * `reportError`, so Sentry still records it.
 */
async function toastOnFailure(work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    toast({ title: "Something went wrong, please try again", variant: "destructive" });
    reportError(error);
  }
}

export { toast, toastManager, toastOnError, toastOnFailure, useToast };
