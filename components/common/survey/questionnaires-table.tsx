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
import type { PrintRunCopies, PrintRunCopy } from "#/lib/survey/print-run-queries";
import { QuestionnaireVoidDialog } from "./questionnaire-void-dialog";

function copyColumns(showsStudent: boolean): ColumnDef<PrintRunCopy>[] {
  return [
    {
      accessorKey: "serial",
      header: "Serial",
      id: "Serial",
      cell: ({ row }) => <span className="tabular-nums">{row.original.serial}</span>,
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
          } satisfies ColumnDef<PrintRunCopy>,
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
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === SurveyQuestionnaireStatus.VOID ? "destructive" : "outline-solid"
          }
        >
          {SURVEY_QUESTIONNAIRE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "button",
      cell: ({ row }) =>
        row.original.status !== SurveyQuestionnaireStatus.VOID && (
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
}: PrintRunCopies & { prefill: SurveyVersionPrefill | null; runPath: string }) {
  return (
    <div className="space-y-3">
      <DataTable
        data={copies}
        columns={prefill === SurveyVersionPrefill.STUDENT ? STUDENT_COPY_COLUMNS : COPY_COLUMNS}
        className="data-table data-table-action bg-white"
        emptyStateMessage="No copies"
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
