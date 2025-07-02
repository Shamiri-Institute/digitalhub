"use client";

import type { ImplementerRole } from "@prisma/client";
import { Plus } from "lucide-react";
import { useContext } from "react";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import { columns } from "#/components/common/schools/columns";
import SchoolDetailsForm from "#/components/common/schools/school-details-form";
import SchoolsDataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";

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
  // biome-ignore lint/style/useTemplate: need for proper formatting for csv data type download
  const csvContent = "data:text/csv;charset=utf-8," + schoolsCSVHeaders.join(",") + "\n";
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "schools-upload-template.csv");
  document.body.appendChild(link);
  link.click();
};

export default function SchoolsDatatable({ role }: { role: ImplementerRole }) {
  // TODO: Refactor this component to not use context
  const schoolsContext = useContext(SchoolsDataContext);
  const schoolInfoContext = useContext(SchoolInfoContext);

  const renderTableActions = () => {
    return (
      role === "HUB_COORDINATOR" && (
        <>
          <SchoolDetailsForm />
          <Button
            className="flex gap-1"
            onClick={() => {
              schoolInfoContext.setSchool(null);
              schoolInfoContext.setEditDialog(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Add school</span>
          </Button>
        </>
      )
    );
  };
  return (
    <SchoolsDataTable
      data={schoolsContext.schools}
      columns={columns({ role })}
      emptyStateMessage="No schools found for this hub"
      className="data-table bg-white lg:mt-4"
      columnVisibilityState={{
        "School ID": false,
        "Sub - county": false,
        "Point teacher": false,
        "Point teacher phone no.": false,
        "Point teacher email": false,
        "Point supervisor phone no.": false,
        "Point supervisor email": false,
      }}
      renderTableActions={renderTableActions()}
    />
  );
}
