"use client";

import { useEffect, useState } from "react";
import {
  archiveAttendanceDocument,
  getAttendanceDocument,
} from "#/lib/actions/file/student-attendance";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { useToast } from "#/components/ui/use-toast";
import { PdfViewer } from "#/lib/utils/pdf";

export default function ViewAttendanceDocument({
  sessionId,
  groupId,
}: {
  sessionId: string;
  groupId: string;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    url?: string;
    fileName?: string;
    id?: string;
    archived?: boolean;
    archiving?: boolean;
  }>({ loading: true });

  useEffect(() => {
    getAttendanceDocument(sessionId, groupId).then((result) => {
      if (result.success) {
        setState({
          loading: false,
          url: result.data!.presignedUrl,
          fileName: result.data!.fileName,
          id: result.data!.id,
        });
      } else {
        setState({ loading: false, error: result.error });
      }
    });
  }, [sessionId, groupId]);

  const handleDelete = async () => {
    if (!state.id) return;
    setState((prev) => ({ ...prev, archiving: true }));
    const result = await archiveAttendanceDocument(state.id);
    if (result.success) {
      setState({ loading: false, archived: true, archiving: false });
      toast({ description: "Attendance document deleted successfully." });
    } else {
      setState((prev) => ({ ...prev, archiving: false }));
      toast({
        description: result.error ?? "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  if (state.loading) return <Skeleton className="h-96 w-full rounded-lg" />;

  if (state.archived) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        Document has been deleted.
      </div>
    );
  }

  if (state.error === "No attendance document found for this session") {
    return (
      <div className="flex h-48 items-center justify-center p-4">
        <Alert variant="primary">
          <AlertDescription>
            No attendance document has been uploaded for this session yet. Use the{" "}
            <strong>Upload</strong> tab above to upload one.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        {state.error}
      </div>
    );
  }

  if (!state.url) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="max-w-[60%] truncate text-sm font-medium text-gray-700">
          {state.fileName ?? "document.pdf"}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={state.url} download={state.fileName ?? "document.pdf"}>
              Download
            </a>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} loading={state.archiving}>
            {state.archiving ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <PdfViewer url={state.url} fileName={state.fileName ?? "document.pdf"} />
      </div>
    </div>
  );
}
