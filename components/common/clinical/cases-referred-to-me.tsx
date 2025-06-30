"use client";

import {
  AcceptRefferedClinicalCase,
  RejectRefferedClinicalCase,
} from "#/app/actions";
import { Icons } from "#/components/icons";
import { Card } from "#/components/ui/card";
import { useToast } from "#/components/ui/use-toast";
import type { ClinicalScreeningInfo, Student } from "@prisma/client";

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
    <div className="w-full">
      <span className="text-sm font-medium">
        Cases referred to you : {cases.length}
      </span>
      {cases.map((stud) => (
        <RefferedCasesTab
          key={stud.id}
          name={stud?.student.studentName}
          caseId={stud.id}
          currentSupervisorId={currentSupervisorId || ""}
          referredToSupervisorId={stud.referredToSupervisorId}
          referralNotes={stud.referralNotes}
        />
      ))}
    </div>
  );
}

export function RefferedCasesTab({
  name = "",
  caseId = "",
  currentSupervisorId = "",
  referredToSupervisorId = "",
  referralNotes = "",
}: {
  name: string | null;
  caseId: string;
  currentSupervisorId: string;
  referredToSupervisorId: string | null;
  referralNotes: string | null;
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

  function handleWordLimit(text: string | null, limit: number) {
    if (!text) return "";
    if (text.length > limit) {
      return text.slice(0, limit) + "...";
    }
    return text;
  }

  return (
    <Card className="my-2 flex items-center justify-between  gap-5 bg-white p-4 pr-3.5">
      <p className="text-base font-medium text-brand">{name}</p>
      <span className="text-sm font-normal text-muted-foreground">
        {handleWordLimit(referralNotes, 50)}
      </span>
      <div className="flex items-center justify-between">
        <button onClick={handleAcceptReferredCase} className="cursor-pointer">
          <Icons.check className="mx-2 h-6 w-6 align-baseline text-muted-green xl:h-7 xl:w-7" />
        </button>
        <button onClick={handleRejectReferredCase} className="cursor-pointer">
          <Icons.xIcon className="mx-2 h-6 w-6 align-baseline text-shamiri-red xl:h-7 xl:w-7" />
        </button>
      </div>
    </Card>
  );
}
