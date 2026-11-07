"use client";

import { format } from "date-fns";
import { useTransition } from "react";
import {
  acceptReferredClinicalCase,
  type CaseReferredToMe,
  rejectReferredClinicalCase,
} from "#/app/(platform)/sc/clinical/action";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toastOnFailure, useToast } from "#/components/ui/use-toast";
import { riskStatusOptions } from "#/db/enums";
import { DISPLAY_DATE } from "#/lib/date-utils";

const riskBadgeVariant = {
  [riskStatusOptions.High]: "destructive",
  [riskStatusOptions.Medium]: "warning",
  [riskStatusOptions.Low]: "shamiri-green",
  [riskStatusOptions.No]: "outline-solid",
} as const;

export function CasesReferredToMe({ cases }: { cases: CaseReferredToMe[] }) {
  return (
    <section className="w-full space-y-2">
      <h2 className="text-sm font-medium">Cases referred to you ({cases.length})</h2>
      {cases.length > 0 && (
        <ul className="space-y-2">
          {cases.map((referredCase) => (
            <ReferredCaseCard key={referredCase.id} referredCase={referredCase} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReferredCaseCard({ referredCase }: { referredCase: CaseReferredToMe }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const referrerName =
    referredCase.referredFromSupervisor?.supervisorName ?? referredCase.referredFromSpecified;
  const referredAt = referredCase.caseTransferTrail[0]?.date;
  const referralDetails = [
    referredCase.student.school?.schoolName,
    referrerName && `Referred by ${referrerName}`,
    referredAt && format(referredAt, DISPLAY_DATE),
  ].filter(Boolean);

  const answer = (decision: "accept" | "reject") =>
    startTransition(() =>
      toastOnFailure(async () => {
        const response =
          decision === "accept"
            ? await acceptReferredClinicalCase(referredCase.id)
            : await rejectReferredClinicalCase(referredCase.id);
        const [done, doing] =
          decision === "accept" ? ["accepted", "accepting"] : ["rejected", "rejecting"];
        toast(
          response.success
            ? { variant: "default", title: `Referred case ${done}` }
            : { variant: "destructive", title: `Error ${doing} referred case. Please try again` },
        );
      }),
    );

  return (
    <li>
      <Card className="flex flex-col gap-4 bg-white p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium text-shamiri-new-blue">
              {referredCase.student.studentName ?? referredCase.pseudonym}
            </p>
            {referredCase.pseudonym && (
              <span className="text-sm text-muted-foreground">{referredCase.pseudonym}</span>
            )}
            <Badge variant={riskBadgeVariant[referredCase.riskStatus]}>
              Risk: {referredCase.riskStatus}
            </Badge>
          </div>
          {referralDetails.length > 0 && (
            <p className="text-sm text-muted-foreground">{referralDetails.join(" · ")}</p>
          )}
          {(referredCase.referralReason || referredCase.referralNotes) && (
            <p className="text-sm whitespace-pre-line">
              {referredCase.referralReason && (
                <span className="font-medium">{referredCase.referralReason}. </span>
              )}
              {referredCase.referralNotes}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => answer("reject")}
            aria-label="Reject referred case"
          >
            Reject
          </Button>
          <Button
            variant="brand"
            disabled={isPending}
            onClick={() => answer("accept")}
            aria-label="Accept referred case"
          >
            Accept
          </Button>
        </div>
      </Card>
    </li>
  );
}
