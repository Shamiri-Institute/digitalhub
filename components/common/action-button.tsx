"use client";

import { useState } from "react";

import { Button, type ButtonProps } from "#/components/ui/button";
import { toast, toastOnError } from "#/components/ui/use-toast";
import type { ActionResponse } from "#/types/actions.types";

export function toastResponse(response: ActionResponse) {
  toast({
    variant: response.success ? "default" : "destructive",
    description: response.message,
  });
}

export function ActionButton({
  action,
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "disabled" | "loading"> & {
  action: () => Promise<ActionResponse>;
}) {
  const [running, setRunning] = useState(false);
  const run = toastOnError(async () => {
    setRunning(true);
    try {
      toastResponse(await action());
    } finally {
      setRunning(false);
    }
  });
  return <Button {...buttonProps} onClick={run} disabled={running} loading={running} />;
}
