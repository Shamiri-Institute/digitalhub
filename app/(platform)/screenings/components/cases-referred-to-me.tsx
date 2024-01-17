"use client";

import {
  AcceptRefferedClinicalCase,
  RejectRefferedClinicalCase,
} from "#/app/actions";
import { Icons } from "#/components/icons";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import { ClinicalScreeningInfo, Student } from "@prisma/client";

type CasesType = ClinicalScreeningInfo & {
  student: Student;
};

export function CasesReferredToMe({
  cases = [],
  currentSupervisorId,
}: {
  cases: CasesType[];
  currentSupervisorId: string | undefined;
}) {
  return (
    <div className="min-h-[200px]">
      <h3 className="mb-4 mt-5 text-base font-semibold text-brand xl:text-2xl">
        Cases referred to you
      </h3>
      <Separator />
      {cases.map((stud) => (
        <RefferedCasesTab
          key={stud.id}
          name={stud?.student.studentName}
          caseId={stud.id}
          currentSupervisorId={currentSupervisorId || ""}
          referredToSupervisorId={stud.referredToSupervisorId}
        />
      ))}
      {cases.length === 0 && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-base font-medium text-muted-foreground">
            No cases referred to you yet...
          </p>
        </div>
      )}
    </div>
  );
}

export function RefferedCasesTab({
  name = "",
  caseId = "",
  currentSupervisorId = "",
  referredToSupervisorId = "",
}: {
  name: string | null;
  caseId: string;
  currentSupervisorId: string;
  referredToSupervisorId: string | null;
}) {
  const { toast } = useToast();

  const handleAcceptReferredCase = async () => {
    if (caseId) {
      try {
        await AcceptRefferedClinicalCase(
          currentSupervisorId,
          referredToSupervisorId,
          caseId,
        );
        toast({
          variant: "default",
          title: "Referred case accepted",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error accepting referred case. Please try again",
        });
      }
    }
  };

  const handleRejectReferredCase = async () => {
    try {
      await RejectRefferedClinicalCase(caseId);
      toast({
        variant: "default",
        title: "Referred case rejected",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error rejecting referred case. Please try again",
      });
    }
  };

  return (
    <Card
      className="pr-3.5bg-white my-2 flex  items-center justify-between gap-5 p-4">
      <p className="text-base font-medium text-brand">{name}</p>
      <div className="flex items-center justify-between">
        <button onClick={handleAcceptReferredCase}>
          <Icons.check className="mx-2 h-6 w-6 align-baseline text-muted-green xl:h-7 xl:w-7" />
        </button>
        <button onClick={handleRejectReferredCase}>
          <Icons.xIcon className="mx-2 h-6 w-6 align-baseline text-shamiri-red xl:h-7 xl:w-7" />
        </button>
      </div>
    </Card>
  );
}
