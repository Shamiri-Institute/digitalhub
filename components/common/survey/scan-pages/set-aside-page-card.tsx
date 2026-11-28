"use client";

import { useTransition } from "react";

import { ScanPageFigure } from "#/components/common/survey/scan-pages/scan-page-figure";
import { Button } from "#/components/ui/button";
import { toast, toastOnFailure } from "#/components/ui/use-toast";
import { putScanPageBack } from "#/lib/actions/survey/scan-pages";
import { formatDateTimeIn } from "#/lib/date-utils";
import { personWord } from "#/lib/survey/person-word";
import type { SetAsidePage } from "#/lib/survey/scan-pages/unidentified";

export function SetAsidePageCard({
  page,
  showHub,
  timeZone,
}: {
  page: SetAsidePage;
  showHub: boolean;
  timeZone: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const onPutBack = () =>
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await putScanPageBack({ scanPageId: page.id });
        toast({
          description: response.message,
          variant: response.success ? "default" : "destructive",
        });
      }),
    );
  return (
    <li className="space-y-3 rounded-lg border border-grey-border bg-white p-4">
      <ScanPageFigure page={page} showHub={showHub} timeZone={timeZone}>
        {page.setAside && (
          <p className="text-shamiri-text-grey">
            Set aside by {personWord(page.setAside.by)}
            {timeZone && ` on ${formatDateTimeIn(page.setAside.at, timeZone)}`}
          </p>
        )}
      </ScanPageFigure>
      <Button
        type="button"
        variant="outline"
        onClick={onPutBack}
        disabled={isPending}
        loading={isPending}
      >
        Put back
      </Button>
    </li>
  );
}
