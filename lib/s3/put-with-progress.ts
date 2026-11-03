/**
 * PUTs a file to a presigned URL, reporting the bytes sent. It sends the File itself, which the
 * browser streams without reading it into memory. It fails when `signal` aborts, given `stallMs`
 * when no bytes move for that long, and given `answerMs` when no answer comes that long after every
 * byte is sent; a dropped connection can otherwise leave it hanging.
 */
export function putWithProgress(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (bytesSent: number) => void,
  { signal, stallMs, answerMs }: { signal?: AbortSignal; stallMs?: number; answerMs?: number } = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let stalled: ReturnType<typeof setTimeout> | undefined;
    const fail = (error: Error) => {
      clearTimeout(stalled);
      signal?.removeEventListener("abort", abort);
      reject(error);
    };
    const giveUpAfter = (ms: number | undefined, reason: string) => {
      clearTimeout(stalled);
      if (ms === undefined) {
        return;
      }
      stalled = setTimeout(() => {
        fail(new Error(reason));
        xhr.abort();
      }, ms);
    };
    const watchForStall = () => giveUpAfter(stallMs, "Upload stalled");
    const abort = () => {
      fail(new DOMException("Upload cancelled", "AbortError"));
      xhr.abort();
    };
    if (signal?.aborted) {
      return abort();
    }
    signal?.addEventListener("abort", abort, { once: true });

    xhr.upload.onload = () => giveUpAfter(answerMs, "No answer to the upload");
    xhr.upload.onprogress = (event) => {
      watchForStall();
      if (event.lengthComputable) {
        onProgress(event.loaded);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 0) {
          // Aborted, or a network error; onabort and onerror reject.
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

    // Also an abort this code didn't start, such as the browser stopping the page's requests.
    xhr.onabort = () => fail(new DOMException("Upload aborted", "AbortError"));
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
