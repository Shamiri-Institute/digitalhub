"use client";

import { columns } from "#/app/(platform)/hc/schools/components/columns";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import SchoolsDataTable from "#/components/data-table";
import FileUploader from "#/components/file-uploader";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { useContext } from "react";

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
  const csvContent =
    "data:text/csv;charset=utf-8," + schoolsCSVHeaders.join(",") + "\n";
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "schools-upload-template.csv");
  document.body.appendChild(link);
  link.click();
};

export default function SchoolsDatatable() {
  const context = useContext(SchoolsDataContext);

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex gap-1 bg-white"
          onClick={handleSchoolsCSVTemplateDownload}
        >
          <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
          <span>Download schools CSV template</span>
        </Button>
        <FileUploader
          url="/api/csv-uploads/schools"
          type="schools"
          uploadVisibleMessage="Upload schools CSV"
          metadata={{
            urlPath: "/hc/schools",
          }}
        />
      </div>
    );
  };
  return (
    <SchoolsDataTable
      data={context.schools}
      columns={columns}
      emptyStateMessage="No schools found for this hub"
      className="data-table mt-4 bg-white"
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
