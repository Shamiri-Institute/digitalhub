/**
 * PUTs a file to a presigned URL, reporting the bytes sent. It sends the File itself, which the
 * browser streams without reading it into memory. It fails when `signal` aborts, and, given
 * `stallMs`, when no bytes move for that long, which a dropped connection can otherwise leave
 * hanging.
 */
export function putWithProgress(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (bytesSent: number) => void,
  { signal, stallMs }: { signal?: AbortSignal; stallMs?: number } = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let stalled: ReturnType<typeof setTimeout> | undefined;
    const fail = (error: Error) => {
      clearTimeout(stalled);
      signal?.removeEventListener("abort", abort);
      reject(error);
    };
    const watchForStall = () => {
      if (stallMs === undefined) {
        return;
      }
      clearTimeout(stalled);
      stalled = setTimeout(() => {
        xhr.abort();
        fail(new Error("Upload stalled"));
      }, stallMs);
    };
    const abort = () => {
      xhr.abort();
      fail(new DOMException("Upload cancelled", "AbortError"));
    };
    if (signal?.aborted) {
      return abort();
    }
    signal?.addEventListener("abort", abort, { once: true });

    // Once every byte is sent, the wait is for the server's answer, which no progress measures.
    xhr.upload.onload = () => clearTimeout(stalled);
    xhr.upload.onprogress = (event) => {
      watchForStall();
      if (event.lengthComputable) {
        onProgress(event.loaded);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 0) {
          // Aborted, or a network error; those paths reject.
          return;
        }
        clearTimeout(stalled);
        signal?.removeEventListener("abort", abort);
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(file.size);
          resolve();
        } else {
          console.error("Upload failed:", {
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText,
          });
          reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
        }
      }
    };

    xhr.onerror = () => {
      console.error("XHR Error:", xhr.status, xhr.statusText);
      fail(new Error(`Network error: ${xhr.status} ${xhr.statusText}`));
    };

    xhr.open("PUT", url, true);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.send(file);
    watchForStall();
  });
}
