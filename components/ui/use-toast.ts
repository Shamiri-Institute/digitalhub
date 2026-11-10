import type * as React from "react";

export type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  /** One button in the toast, such as "Reschedule". */
  action?: { label: string; onClick: () => void };
};

// The toast UI is loaded after the page, so toasts raised before it is mounted wait here.
let showToast: ((options: ToastOptions) => void) | null = null;
const waitingToasts: ToastOptions[] = [];

/** Called by the toast viewport once mounted; shows the toasts raised before it was. */
function attachToastViewport(show: (options: ToastOptions) => void) {
  showToast = show;
  for (const options of waitingToasts.splice(0)) show(options);
  return () => {
    showToast = null;
  };
}

function toast(options: ToastOptions) {
  if (showToast) showToast(options);
  else waitingToasts.push(options);
}

function useToast() {
  return { toast };
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

export { attachToastViewport, toast, toastOnError, toastOnFailure, useToast };
