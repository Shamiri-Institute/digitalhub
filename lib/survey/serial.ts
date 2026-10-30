// The only builders of the codes printed on paper copies; CHECKs in db/schema.ts pin their format.
// Safe in client components.

const SERIAL_DIGITS = 6;

export const MAX_COPIES_PER_RUN = 50_000;

/** `formatSerial("BASE26", 17)` is `BASE26-000017`. Wider numbers print in full, so they stay unique. */
export function formatSerial(surveyCode: string, serialNumber: number) {
  return `${surveyCode}-${String(serialNumber).padStart(SERIAL_DIGITS, "0")}`;
}

/** `pageCode("BASE26-000017", 3)` is `BASE26-000017-P3`. */
export function pageCode(serial: string, pageNumber: number) {
  return `${serial}-P${pageNumber}`;
}

export const copyCount = (count: number) => `${count} ${count === 1 ? "copy" : "copies"}`;

export function serialRangeOf(
  surveyCode: string,
  { firstSerialNumber, copyCount }: { firstSerialNumber: number; copyCount: number },
) {
  return {
    firstSerial: formatSerial(surveyCode, firstSerialNumber),
    lastSerial: formatSerial(surveyCode, firstSerialNumber + copyCount - 1),
  };
}
