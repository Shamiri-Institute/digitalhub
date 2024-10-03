"use client";

import {
  filescolumns,
  SchoolFilesTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/files/components/columns";
import { RemoveUploadedFile } from "#/app/(platform)/hc/schools/[visibleId]/files/components/delete-file-modal";
import RenameUploadedFile from "#/app/(platform)/hc/schools/[visibleId]/files/components/rename-file";

import DataTable from "#/components/data-table";
import { Prisma } from "@prisma/client";
import { use, useState } from "react";

export default function SchoolFilesDatatable({
  data,
  hubCoordinator,
}: {
  data: Promise<SchoolFilesTableData[]>;
  hubCoordinator: Prisma.HubCoordinatorGetPayload<{
    include: {
      assignedHub: true;
    };
  }> | null;
}) {
  const schoolFiles = use(data);
  const [renameDialog, setRenameDialog] = useState<boolean>(false);
  const [deleteDialog, setDeleteDialog] = useState<boolean>(false);
  const [file, setFile] = useState<SchoolFilesTableData | null>(null);

  const renderTableActions = () => {
    return <div></div>;
  };

  return (
    <div>
      <DataTable
        data={schoolFiles}
        columns={filescolumns({
          setRenameDialog,
          setFile,
          setDeleteDialog,
        })}
        emptyStateMessage="No files found"
        className="data-table data-table-action mt-4"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{}}
        rowSelectionDescription={"files"}
      />
      {file && (
        <div>
          <RenameUploadedFile
            open={renameDialog}
            onOpenChange={setRenameDialog}
            document={file}
          />
          <RemoveUploadedFile
            document={file}
            isOpen={deleteDialog}
            setIsOpen={setDeleteDialog}
          />
        </div>
      )}
    </div>
  );
}
