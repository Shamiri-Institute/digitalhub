"use client";

import type { ImplementerRole } from "@prisma/client";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type { Session } from "#/components/common/session/sessions-provider";
import { studentAttendanceFileColumns } from "#/components/common/student/student-attendance-files/columns";
import UploadAttendanceDocumentDialog from "#/components/common/student/upload-attendance-dialog";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  getStudentDocuments,
  type StudentAttendanceDocsFilters,
  type StudentAttendanceFileData,
} from "#/lib/actions/file/student-attendance";

export default function StudentAttendanceFilesTable({
  filters,
  session,
  groupId,
  role,
}: {
  filters: StudentAttendanceDocsFilters;
  session?: Session | null;
  groupId?: string;
  role: ImplementerRole;
}) {
  const [data, setData] = useState<StudentAttendanceFileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const docs = await getStudentDocuments(filters);
      setData(docs);
      setLoading(false);
    };
    void load();
  }, [filters]);

  const handleUploadDialogChange: Dispatch<SetStateAction<boolean>> = (value) => {
    const open = typeof value === "function" ? value(uploadDialog) : value;
    setUploadDialog(value);
    if (!open) {
      const refresh = async () => {
        const docs = await getStudentDocuments(filters);
        setData(docs);
      };
      void refresh();
    }
  };

  const renderTableActions = () => {
    if (!session || !groupId) return null;
    return (
      <Button variant="outline" className="flex gap-1" onClick={() => setUploadDialog(true)}>
        <Icons.uploadCloudIcon className="h-4 w-4 text-shamiri-text-grey" />
        <span>Upload attendance document</span>
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.loaderCircle className="h-6 w-6 animate-spin text-shamiri-text-grey" />
      </div>
    );
  }

  return (
    <div>
      <DataTable
        data={data}
        columns={studentAttendanceFileColumns()}
        emptyStateMessage="No student attendance documents found"
        className="data-table data-table-action lg:mt-4"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{
          checkbox: false,
        }}
      />
      <UploadAttendanceDocumentDialog
        session={session}
        groupId={groupId}
        role={role}
        open={uploadDialog}
        onOpenChange={handleUploadDialogChange}
      />
    </div>
  );
}
