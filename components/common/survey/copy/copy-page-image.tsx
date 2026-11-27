"use client";

import { useState } from "react";

import { cn } from "#/lib/utils";

export function CopyPageImage({
  url,
  alt,
  className,
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) {
    return (
      <p
        className={cn(
          "flex aspect-[210/297] w-full items-center justify-center rounded-xs bg-white/70 px-4 text-center text-sm text-shamiri-text-grey",
          className,
        )}
      >
        Image not available
      </p>
    );
  }
  return (
    // oxlint-disable-next-line nextjs/no-img-element -- a short-lived signed link, not an optimisable asset
    <img
      src={url}
      alt={alt}
      // An image that failed before hydration fired its error event before React listened.
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailedUrl(url);
      }}
      onError={() => setFailedUrl(url)}
      className={cn("mx-auto block h-auto max-w-full bg-white shadow-md", className)}
    />
  );
}
