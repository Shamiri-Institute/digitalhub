"use client";

import { ImplementerRole } from "#/db/enums";
import type { VisibilityState } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState } from "react";
import AssignPointSupervisor from "#/components/common/schools/assign-point-supervisor";
import {
  columns,
  type SchoolDialogKind,
  type SchoolsTableData,
} from "#/components/common/schools/columns";
import { DropoutSchool } from "#/components/common/schools/dropout-school-form";
import SchoolDetailsForm from "#/components/common/schools/school-details-form";
import { UndoDropoutSchool } from "#/components/common/schools/undo-dropout-school-form";
import SchoolsDataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import type { supervisor } from "#/db/schema";

const schoolsCSVHeaders = [
  "school_name",
  "numbers_expected",
  "school_demographics",
  "boardingorday",
  "school_type",
  "school_county",
  "school_subcounty",
  "principal_name",
  "principal_phone",
  "point_person_name",
  "point_person_phone",
  "latitude",
  "longitude",
  "presession_date",
];

export const handleSchoolsCSVTemplateDownload = () => {
  // oxlint-disable-next-line prefer-template -- need for proper formatting for csv data type download
  const csvContent = "data:text/csv;charset=utf-8," + schoolsCSVHeaders.join(",") + "\n";
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "schools-upload-template.csv");
  document.body.appendChild(link);
  link.click();
};

type OpenSchoolDialog = { kind: "add" } | { kind: SchoolDialogKind; schoolId: string };

export default function SchoolsDatatable({
  role,
  schools,
  supervisors,
  disablePagination = false,
  isSubComponent = false,
  className,
  columnVisibilityState,
}: {
  role: ImplementerRole;
  schools: SchoolsTableData[];
  supervisors?: Pick<typeof supervisor.$inferSelect, "id" | "supervisorName">[];
  disablePagination?: boolean;
  isSubComponent?: boolean;
  className?: string;
  columnVisibilityState?: VisibilityState;
}) {
  const [dialog, setDialog] = useState<OpenSchoolDialog | null>(null);
  const school =
    dialog && dialog.kind !== "add" ? schools.find((s) => s.id === dialog.schoolId) : undefined;

  const onDialogOpenChange = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const renderTableActions = () => {
    return (
      role === ImplementerRole.HUB_COORDINATOR && (
        <Button className="flex gap-1" onClick={() => setDialog({ kind: "add" })}>
          <Plus className="h-4 w-4" />
          <span>Add school</span>
        </Button>
      )
    );
  };

  return (
    <>
      <SchoolsDataTable
        data={schools}
        columns={columns({
          role,
          state: {
            openDialog: (kind, { id: schoolId }) => setDialog({ kind, schoolId }),
          },
        })}
        emptyStateMessage="No schools found for this hub"
        className={cn("data-table bg-white lg:mt-4", className)}
        columnVisibilityState={{
          ...columnVisibilityState,
          "School ID": false,
          "Sub - county": false,
          "Point teacher": false,
          "Point teacher phone no.": false,
          "Point teacher email": false,
          "Point supervisor phone no.": false,
          "Point supervisor email": false,
        }}
        renderTableActions={renderTableActions()}
        disablePagination={disablePagination}
        isSubComponent={isSubComponent}
      />
      {role === "HUB_COORDINATOR" && (
        <>
          <SchoolDetailsForm
            school={null}
            open={dialog?.kind === "add"}
            setOpen={onDialogOpenChange}
          />
          {school && (
            <>
              <SchoolDetailsForm
                school={school}
                open={dialog?.kind === "edit"}
                setOpen={onDialogOpenChange}
              />
              <AssignPointSupervisor
                supervisors={supervisors ?? []}
                open={dialog?.kind === "pointSupervisor"}
                setOpen={onDialogOpenChange}
                school={school}
              />
              <DropoutSchool
                school={school}
                open={dialog?.kind === "dropout"}
                setOpen={onDialogOpenChange}
              />
              <UndoDropoutSchool
                school={school}
                open={dialog?.kind === "undoDropout"}
                setOpen={onDialogOpenChange}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
