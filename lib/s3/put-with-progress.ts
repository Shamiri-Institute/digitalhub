/**
 * PUTs a file to a presigned URL, reporting the bytes sent. It sends the File itself, which the
 * browser streams without reading it into memory.
 */
export function putWithProgress(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (bytesSent: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
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
      reject(new Error(`Network error: ${xhr.status} ${xhr.statusText}`));
    };

    xhr.open("PUT", url, true);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.send(file);
  });
}
