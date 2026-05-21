"use client";

import { useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";

export default function PdfViewer({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="truncate text-sm font-medium">{fileName}</span>
        <a href={url} download={fileName}>
          <Button variant="outline" size="sm">
            <Icons.fileDown className="mr-2 h-4 w-4" />
            Download
          </Button>
        </a>
      </div>
      <div className="relative flex-1">
        {loading && !error && <Skeleton className="h-full w-full rounded-none" />}
        {error && (
          <div className="flex h-full items-center justify-center text-gray-500">
            Failed to load PDF
          </div>
        )}
        <iframe
          src={url}
          className="h-full w-full"
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
        />
      </div>
    </div>
  );
}
