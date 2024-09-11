"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import {
  columns,
  MainFellowTableData,
} from "#/app/(platform)/hc/fellows/components/columns";
import { BatchUploadDownloadFellow } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/upload-csv";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";
import { Prisma } from "@prisma/client";
import { useState } from "react";

export default function MainFellowsDatatable({
  fellows,
  supervisors,
}: {
  fellows: MainFellowTableData[];
  supervisors: Prisma.SupervisorGetPayload<{}>[];
}) {
  const [fellow, setFellow] = useState<MainFellowTableData | null>(null);
  const [editDialog, setEditDialog] = useState<boolean>(false);

  const renderTableActions = () => {
    return (
      <div className="flex items-center gap-3">
        <BatchUploadDownloadFellow />
        <FellowDetailsForm mode={"add"}>
          <DialogTrigger asChild={true}>
            <Button variant={"outline"} className={"bg-white"}>
              Add new fellow
            </Button>
          </DialogTrigger>
        </FellowDetailsForm>
      </div>
    );
  };

  return (
    <div>
      <DataTable
        columns={columns(supervisors, setFellow, setEditDialog)}
        data={fellows}
        className={"data-table data-table-action mt-4 bg-white"}
        emptyStateMessage="No fellows associated with this hub"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{
          Email: false,
          Gender: false,
          County: false,
          "Sub-county": false,
        }}
      />
      {fellow && (
        <FellowDetailsForm
          fellow={fellow}
          open={editDialog}
          onOpenChange={setEditDialog}
          mode={"edit"}
        />
      )}
    </div>
  );
}
