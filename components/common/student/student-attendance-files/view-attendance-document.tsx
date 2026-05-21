"use client";

import { useEffect, useState } from "react";
import { getAttendanceDocument } from "#/lib/actions/file/student-attendance";
import { PdfViewer } from "#/lib/utils/pdf";
import { Skeleton } from "#/components/ui/skeleton";

export default function ViewAttendanceDocument({
  sessionId,
  groupId,
}: {
  sessionId: string;
  groupId: string;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    url?: string;
    fileName?: string;
  }>({ loading: true });

  useEffect(() => {
    getAttendanceDocument(sessionId, groupId).then((result) => {
      if (result.success) {
        setState({
          loading: false,
          url: result.data!.presignedUrl,
          fileName: result.data!.fileName,
        });
      } else {
        setState({ loading: false, error: result.error });
      }
    });
  }, [sessionId, groupId]);

  if (state.loading) return <Skeleton className="h-96 w-full rounded-lg" />;

  if (state.error) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        {state.error}
      </div>
    );
  }

  if (!state.url) return null;

  return <PdfViewer url={state.url} fileName={state.fileName ?? "document.pdf"} />;
}
