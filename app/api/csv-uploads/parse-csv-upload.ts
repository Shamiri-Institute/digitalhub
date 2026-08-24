import { parse } from "csv-parse/sync";

/**
 * Parses an uploaded CSV buffer into header-keyed records.
 * Throws if any required header is missing or the CSV is malformed,
 * so callers can map failures to a 400 response.
 */
export function parseCsvUpload<Header extends string>(
  fileBuffer: Buffer,
  requiredHeaders: readonly Header[],
): Record<Header, string>[] {
  return parse(fileBuffer, {
    bom: true,
    skip_empty_lines: true,
    columns: (headers: string[]) => {
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header.trim()));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
      }
      return headers;
    },
  }) as Record<Header, string>[];
}
