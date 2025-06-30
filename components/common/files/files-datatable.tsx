"use client";

import { fileColumns, type SchoolFilesTableData } from "#/components/common/files/columns";
import { RemoveUploadedFile } from "#/components/common/files/delete-file-modal";
import UploadFileDialogue from "#/components/common/files/files-upload-dialogue";
import RenameUploadedFile from "#/components/common/files/rename-file";

import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { use, useState } from "react";

export default function SchoolFilesDatatable({
  data,
  schoolId,
}: {
  data: Promise<SchoolFilesTableData[]>;
  schoolId: string;
}) {
  const schoolFiles = use(data);
  const [renameDialog, setRenameDialog] = useState<boolean>(false);
  const [deleteDialog, setDeleteDialog] = useState<boolean>(false);
  const [file, setFile] = useState<SchoolFilesTableData | null>(null);
  const [uploadDialog, setUploadDialog] = useState<boolean>(false);

  const renderTableActions = () => {
    return (
      <Button onClick={() => setUploadDialog(true)} className="gap-1">
        <Icons.plusCircle className="h-4 w-4" />
        <span>Upload file</span>
      </Button>
    );
  };

  return (
    <div>
      <DataTable
        data={schoolFiles}
        columns={fileColumns({
          setRenameDialog,
          setFile,
          setDeleteDialog,
        })}
        emptyStateMessage="No files found"
        className="data-table data-table-action lg:mt-4"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{}}
        rowSelectionDescription={"files"}
      />
      {file && (
        <div>
          <RenameUploadedFile open={renameDialog} onOpenChange={setRenameDialog} document={file} />
          <RemoveUploadedFile document={file} isOpen={deleteDialog} setIsOpen={setDeleteDialog} />
        </div>
      )}
      <UploadFileDialogue schoolId={schoolId} open={uploadDialog} onOpenChange={setUploadDialog} />
    </div>
  );
}
