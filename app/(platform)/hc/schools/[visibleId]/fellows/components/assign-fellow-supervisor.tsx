"use client";

import { assignFellowSupervisor } from "#/app/(platform)/hc/schools/[visibleId]/fellows/actions";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AssignFellowSupervisor({
  fellowId,
  supervisorId,
  supervisors,
}: {
  fellowId: string;
  supervisorId: string;
  supervisors: Prisma.SupervisorGetPayload<{}>[];
}) {
  const pathname = usePathname();
  const [selectedSupervisor, setSelectedSupervisor] = useState(supervisorId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const assignSupervisor = async () => {
        if (selectedSupervisor !== supervisorId) {
          setLoading(true);
          const result = await assignFellowSupervisor({
            fellowId,
            supervisorId: selectedSupervisor,
          });
          if (result.success) {
            revalidatePageAction(pathname);
          }
          toast({ description: result.message });
          setLoading(false);
        }
      };
      assignSupervisor();
    } catch (error: unknown) {
      console.log(error);
    }
  }, [selectedSupervisor]);

  return (
    <div className="flex">
      <Select onValueChange={setSelectedSupervisor} value={selectedSupervisor}>
        <SelectTrigger
          className={cn(
            "h-auto gap-1 px-2 py-0.5",
            loading
              ? "pointer-events-none border-shamiri-light-grey bg-background-secondary text-shamiri-text-dark-grey focus:ring-shamiri-light-grey"
              : "pointer-events-auto border-shamiri-light-blue bg-blue-bg text-shamiri-new-blue",
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
    </div>
  );
}
