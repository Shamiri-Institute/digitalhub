"use client";

import { useOptimistic, useTransition } from "react";
import { assignFellowSupervisor } from "#/app/(platform)/hc/schools/[visibleId]/fellows/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast, toastOnFailure } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import type { supervisor } from "#/db/schema";

export default function AssignFellowSupervisorSelect({
  fellowId,
  supervisorId,
  supervisors,
  disabled = false,
}: {
  fellowId: string;
  supervisorId: string | null;
  supervisors: Pick<typeof supervisor.$inferSelect, "id" | "supervisorName">[];
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [shownSupervisorId, setShownSupervisorId] = useOptimistic(supervisorId);

  function assignSupervisor(newSupervisorId: string) {
    startTransition(async () => {
      setShownSupervisorId(newSupervisorId);
      await toastOnFailure(async () => {
        const result = await assignFellowSupervisor({ fellowId, supervisorId: newSupervisorId });
        toast(
          result.success
            ? { description: result.message }
            : { variant: "destructive", description: result.error },
        );
      });
    });
  }

  return (
    <div className="flex">
      {disabled ? (
        supervisors.find((supervisor) => supervisor.id === shownSupervisorId)?.supervisorName
      ) : (
        <Select onValueChange={assignSupervisor} value={shownSupervisorId ?? undefined}>
          <SelectTrigger
            aria-label="Supervisor"
            className={cn(
              "h-auto gap-1 px-2 py-0.5",
              supervisorId !== null
                ? "border-info-border bg-info-bg text-primary"
                : "border-destructive bg-destructive-bg text-destructive",
              isPending
                ? "pointer-events-none border-border bg-muted text-muted-foreground"
                : "pointer-events-auto",
            )}
          >
            <SelectValue placeholder="Select a supervisor" />
          </SelectTrigger>
          <SelectContent>
            {supervisors.map((supervisor) => {
              return (
                <SelectItem key={supervisor.id} value={supervisor.id}>
                  {supervisor.supervisorName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
