"use client";

import Link from "next/link";

import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { SurveyVersionStatus } from "#/db/enums";
import { createDraftVersion } from "#/lib/actions/survey";
import type { SurveyVersionRow } from "../../queries";

interface VersionMenuProps {
  surveyId: string;
  version: SurveyVersionRow;
  /** A survey has at most one draft, so a new one waits until the current draft is published. */
  hasDraft: boolean;
}

export default function VersionMenu({ surveyId, version, hasDraft }: VersionMenuProps) {
  const isDraft = version.status === SurveyVersionStatus.DRAFT;

  const handleCreateDraft = toastOnError(async () => {
    const response = await createDraftVersion({ surveyId, fromVersionId: version.id });
    toast({
      variant: response.success ? "default" : "destructive",
      description: response.message,
    });
  });

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
