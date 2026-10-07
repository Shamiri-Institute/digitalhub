"use client";

import type { ImplementerRole } from "#/db/enums";
import { useEffect, useState, useTransition } from "react";
import { Icons } from "#/components/icons";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { toastOnFailure, useToast } from "#/components/ui/use-toast";
import { deleteAttendanceFile, getAttendanceDocument } from "#/lib/actions/file/student-attendance";
import { NO_ATTENDANCE_DOCUMENT_MESSAGE } from "#/lib/actions/file/student-attendance/types";
import PdfViewerModal from "#/lib/utils/pdf/pdf-viewer-modal";

export default function ViewAttendanceDocument({
  sessionId,
  groupId,
  role,
  onDeleteSuccess,
}: {
  sessionId: string;
  groupId: string;
  role: ImplementerRole;
  onDeleteSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    url?: string;
    fileName?: string;
    id?: string;
    link?: string;
    archived?: boolean;
  }>({ loading: true });

  // effect: loads the presigned document URL on mount
  useEffect(() => {
    async function loadDocument() {
      try {
        const result = await getAttendanceDocument({ sessionId, groupId });
        if (result.success) {
          setState({
            loading: false,
            url: result.data?.presignedUrl,
            fileName: result.data?.fileName,
            id: result.data?.id,
            link: result.data?.link,
          });
        } else {
          setState({ loading: false, error: result.message });
        }
      } catch {
        setState({ loading: false, error: "Failed to load document" });
      }
    }

    void loadDocument();
  }, [sessionId, groupId]);

  const handleDelete = () => {
    const documentId = state.id;
    if (!documentId) return;
    startDeleting(() =>
      toastOnFailure(async () => {
        const result = await deleteAttendanceFile(documentId);
        if (result.success) {
          setState({ loading: false, archived: true });
          onDeleteSuccess?.();
          toast({ description: "Attendance document deleted successfully." });
        } else {
          toast({
            description: result.message ?? "Failed to delete document",
            variant: "destructive",
          });
        }
      }),
    );
  };

  if (state.loading) return <Skeleton className="h-16 w-full rounded-lg" />;

  if (state.archived) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-shamiri-text-grey">
        Document has been deleted.
      </div>
    );
  }

  if (state.error === NO_ATTENDANCE_DOCUMENT_MESSAGE) {
    return (
      <div className="flex items-center justify-center p-4">
        <Alert variant="primary">
          <AlertDescription>
            {role === "FELLOW"
              ? "Upload is not available. Please use the upload section below to take a picture."
              : "The fellow did not upload an attendance document."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-shamiri-text-grey">
        {state.error}
      </div>
    );
  }

  if (!state.url) return null;

  return (
    <div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-4">
        <button
          type="button"
          onClick={() => setPdfModalOpen(true)}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-shamiri-light-grey p-4 transition-colors hover:border-shamiri-new-blue hover:bg-blue-bg"
        >
          <Icons.paperFileText className="h-10 w-10 text-shamiri-new-blue" />
          <span className="mt-2 text-xs text-shamiri-text-grey">Click to view</span>
        </button>
        <div className="min-w-0">
          <p
            className="truncate text-sm font-medium text-shamiri-text-dark-grey"
            title={state.fileName}
          >
            {state.fileName ?? "document.pdf"}
          </p>
          {role === "FELLOW" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              loading={isDeleting}
              className="mt-2 w-fit hover:bg-shamiri-light-red/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>
      </div>
      <PdfViewerModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        url={state.url}
        fileName={state.fileName}
      />
    </div>
  );
}
