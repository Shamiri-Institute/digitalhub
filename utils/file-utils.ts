/**
 * Utility functions for file handling
 */

/**
 * Reads the content of a file and returns it as a Blob
 * @param file The file to read
 * @returns A Promise that resolves to a Blob containing the file content
 */
export function readFileContent(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Blob([reader.result], { type: file.type }));
      } else {
        reject(new Error("Failed to read file content"));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
}
