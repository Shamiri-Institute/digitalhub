"use client";

import { useState } from "react";
import { retryRecordingProcessing } from "#/app/(platform)/sc/recordings/actions";
import { Button } from "#/components/ui/button";
import { useToast } from "#/components/ui/use-toast";
import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

interface RetryProcessingButtonProps {
  recordingId: string;
  disabled?: boolean;
  className?: string;
}

export default function RetryProcessingButton({
  recordingId,
  disabled = false,
  className,
}: RetryProcessingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRetry = async () => {
    setIsLoading(true);

    try {
      const result = await retryRecordingProcessing(recordingId);

      if (result.success) {
        toast({
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error) {
      console.error("Error retrying recording:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={disabled || isLoading}
      className={cn("gap-2", className)}
    >
      {isLoading ? (
        <Icons.loaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Icons.arrowUp className="h-4 w-4" />
      )}
      Retry
    </Button>
  );
}
