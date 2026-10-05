"use client";

import {
  acceptReferredClinicalCase,
  rejectReferredClinicalCase,
} from "#/app/(platform)/sc/clinical/action";
import { Icons } from "#/components/icons";
import { Card } from "#/components/ui/card";
import { toastOnError, useToast } from "#/components/ui/use-toast";
import type { clinicalScreeningInfo, student } from "#/db/schema";

type CasesType = typeof clinicalScreeningInfo.$inferSelect & {
  student: typeof student.$inferSelect;
};

export function CasesReferredToMe({ cases }: { cases: CasesType[] }) {
  return (
    <div className="w-full">
      <span className="text-sm font-medium">Cases referred to you : {cases.length}</span>
      {cases.map((stud) => (
        <RefferedCasesTab
          key={stud.id}
          name={stud?.student.studentName}
          caseId={stud.id}
          referralNotes={stud.referralNotes}
        />
      ))}
    </div>
  );
}

export function RefferedCasesTab({
  name,
  caseId,
  referralNotes,
}: {
  name: string | null;
  caseId: string;
  referralNotes: string | null;
}) {
  const { toast } = useToast();

  const handleAcceptReferredCase = async () => {
    const response = await acceptReferredClinicalCase(caseId);
    toast(
      response.success
        ? { variant: "default", title: "Referred case accepted" }
        : { variant: "destructive", title: "Error accepting referred case. Please try again" },
    );
  };

  const handleRejectReferredCase = async () => {
    const response = await rejectReferredClinicalCase(caseId);
    toast(
      response.success
        ? { variant: "default", title: "Referred case rejected" }
        : { variant: "destructive", title: "Error rejecting referred case. Please try again" },
    );
  };

  function handleWordLimit(text: string | null, limit: number) {
    if (!text) return "";
    if (text.length > limit) {
      return `${text.slice(0, limit)}...`;
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
        <button
          type="button"
          onClick={toastOnError(handleAcceptReferredCase)}
          className="cursor-pointer"
          aria-label="Accept referred case"
        >
          <Icons.check className="mx-2 h-6 w-6 align-baseline text-muted-green xl:h-7 xl:w-7" />
        </button>
        <button
          type="button"
          onClick={toastOnError(handleRejectReferredCase)}
          className="cursor-pointer"
          aria-label="Reject referred case"
        >
          <Icons.xIcon className="mx-2 h-6 w-6 align-baseline text-shamiri-red xl:h-7 xl:w-7" />
        </button>
      </div>
    </Card>
  );
}
