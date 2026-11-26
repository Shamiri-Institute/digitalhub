import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import type * as React from "react";

const toastManager = ToastPrimitive.createToastManager();

type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: { label: string; onClick: () => void };
};

function toast({ title, description, variant = "default", action }: ToastOptions) {
  const id = toastManager.add({
    title,
    description,
    type: variant,
    actionProps: action && { children: action.label, onClick: action.onClick },
  });
  return { id, dismiss: () => toastManager.close(id) };
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

export { toast, toastManager, toastOnError, toastOnFailure };
