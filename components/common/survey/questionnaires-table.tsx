"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import DataTable from "#/components/data-table";
import { Badge } from "#/components/ui/badge";
import {
  SURVEY_QUESTIONNAIRE_STATUS_LABELS,
  SurveyQuestionnaireStatus,
  SurveyVersionPrefill,
} from "#/db/enums";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { copyHref } from "#/lib/survey/copy/paths";
import type { PrintRunCopies, PrintRunCopy } from "#/lib/survey/print-run-queries";
import { QuestionnaireVoidDialog } from "./questionnaire-void-dialog";

type LinkedCopy = PrintRunCopy & { href: string; viewerMayVoid: boolean };

export function QuestionnaireStatusBadge({ status }: { status: SurveyQuestionnaireStatus }) {
  return (
    <Badge
      variant={
        status === SurveyQuestionnaireStatus.VOID
          ? "destructive"
          : status === SurveyQuestionnaireStatus.VERIFIED
            ? "shamiri-green"
            : "outline-solid"
      }
    >
      {SURVEY_QUESTIONNAIRE_STATUS_LABELS[status]}
    </Badge>
  );
}

function copyColumns(showsStudent: boolean): ColumnDef<LinkedCopy>[] {
  return [
    {
      accessorKey: "serial",
      header: "Serial",
      id: "Serial",
      cell: ({ row }) => (
        <Link
          href={row.original.href}
          className="font-mono text-shamiri-new-blue tabular-nums underline-offset-4 hover:underline"
        >
          {row.original.serial}
        </Link>
      ),
    },
    {
      accessorFn: (copy) => copy.school.schoolName,
      header: "School",
      id: "School",
    },
    ...(showsStudent
      ? [
          {
            accessorFn: (copy) => copy.student?.studentName,
            header: "Student",
            id: "Student",
            cell: ({ row }) => {
              const copyStudent = row.original.student;
              return (
                <>
                  {copyStudent?.studentName}
                  {copyStudent?.admissionNumber && (
                    <span className="text-shamiri-text-grey"> · {copyStudent.admissionNumber}</span>
                  )}
                </>
              );
            },
          } satisfies ColumnDef<LinkedCopy>,
        ]
      : []),
    {
      id: "Page codes",
      header: "Page codes",
      cell: ({ row }) => (
        <ul className="flex flex-wrap gap-x-3 text-xs tabular-nums text-shamiri-text-grey">
          {row.original.pages.map((p) => (
            <li key={p.code}>{p.code}</li>
          ))}
        </ul>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      id: "Status",
      cell: ({ row }) => <QuestionnaireStatusBadge status={row.original.status} />,
    },
    {
      id: "button",
      cell: ({ row }) =>
        row.original.viewerMayVoid && (
          <QuestionnaireVoidDialog copy={{ id: row.original.id, serial: row.original.serial }} />
        ),
      enableHiding: false,
    },
  ];
}

// Built once: a cell function made on each render is a new component type to React, so a refresh
// would remount every row and close a void dialog the viewer has open.
const COPY_COLUMNS = copyColumns(false);
const STUDENT_COPY_COLUMNS = copyColumns(true);

/**
 * One page of a run's copies, with links to the pages before and after it. A run can hold
 * 50,000 copies, so the server pages them and the table shows one page whole.
 */
export function QuestionnairesTable({
  copies,
  pageCount,
  page,
  prefill,
  runPath,
  viewerKind,
}: PrintRunCopies & {
  prefill: SurveyVersionPrefill | null;
  runPath: string;
  viewerKind: SurveyViewer["kind"];
}) {
  return (
    <div className="space-y-3">
      <DataTable
        data={copies.map((copy) => ({
          ...copy,
          href: copyHref(viewerKind, copy.id),
          // Only Research undoes a verified copy.
          viewerMayVoid:
            copy.status !== SurveyQuestionnaireStatus.VOID &&
            (viewerKind === "project" || copy.status !== SurveyQuestionnaireStatus.VERIFIED),
        }))}
        columns={prefill === SurveyVersionPrefill.STUDENT ? STUDENT_COPY_COLUMNS : COPY_COLUMNS}
        className="data-table data-table-action bg-white"
        emptyStateMessage="Copies appear here as their files are made"
        getRowCanExpand={() => false}
        disableSearch
        disablePagination
      />
      {pageCount > 1 && (
        <nav className="flex items-center justify-end gap-4 text-sm" aria-label="Copies pages">
          {page > 1 && (
            <Link href={`${runPath}?page=${page - 1}`} className="text-shamiri-new-blue">
              Previous
            </Link>
          )}
          <span className="text-shamiri-text-grey">
            Page {page} of {pageCount}
          </span>
          {page < pageCount && (
            <Link href={`${runPath}?page=${page + 1}`} className="text-shamiri-new-blue">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
