"use client";

import { useState } from "react";

import { Button, type ButtonProps } from "#/components/ui/button";
import { toast, toastOnError } from "#/components/ui/use-toast";
import type { ActionResponse } from "#/types/actions.types";

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
      const response = await action();
      toast({
        variant: response.success ? "default" : "destructive",
        description: response.message,
      });
    } finally {
      setRunning(false);
    }
  });
  return <Button {...buttonProps} onClick={run} disabled={running} loading={running} />;
}
