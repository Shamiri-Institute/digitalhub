"use client";

import Link from "next/link";
import { useState } from "react";

import { Icons } from "#/components/icons";
import { PrintRunDialog } from "#/components/common/survey/print-run-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { SurveyVersionStatus } from "#/db/enums";
import { createDraftVersion } from "#/lib/actions/survey";
import type { PrintableHubs } from "#/lib/survey/print-run-queries";
import type { SurveyVersionRow } from "../../queries";

/** What printing a version needs: the hubs the admin may print for, and where runs live. */
export type VersionPrinting = { hubs: PrintableHubs; runsPath: string };

interface VersionMenuProps {
  surveyId: string;
  surveyCode: string;
  version: SurveyVersionRow;
  /** A survey has at most one draft, so a new one waits until the current draft is published. */
  hasDraft: boolean;
  printing: VersionPrinting | undefined;
}

export default function VersionMenu({
  surveyId,
  surveyCode,
  version,
  hasDraft,
  printing,
}: VersionMenuProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const isDraft = version.status === SurveyVersionStatus.DRAFT;
  // Versions published before layouts existed have no prefill and nothing to print with.
  const printedPrefill =
    printing && version.status === SurveyVersionStatus.PUBLISHED ? version.prefill : null;

  const handleCreateDraft = toastOnError(async () => {
    const response = await createDraftVersion({ surveyId, fromVersionId: version.id });
    toast({
      variant: response.success ? "default" : "destructive",
      description: response.message,
    });
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for v${version.versionNumber}`}
            className="absolute inset-0 flex items-center justify-center border-l focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shamiri-new-blue/60"
          >
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/surveys/${surveyId}/versions/${version.versionNumber}`}>
              {isDraft ? "Edit form" : "View form"}
            </Link>
          </DropdownMenuItem>
          {!isDraft && (
            <DropdownMenuItem disabled={hasDraft} onClick={handleCreateDraft}>
              New draft from v{version.versionNumber}
            </DropdownMenuItem>
          )}
          {printedPrefill && (
            <DropdownMenuItem onClick={() => setIsPrinting(true)}>Print copies</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {printing && printedPrefill && (
        <PrintRunDialog
          version={{
            id: version.id,
            label: `${surveyCode} v${version.versionNumber}`,
            prefill: printedPrefill,
          }}
          hubs={printing.hubs}
          runsPath={printing.runsPath}
          open={isPrinting}
          onOpenChange={setIsPrinting}
        />
      )}
    </>
  );
}
