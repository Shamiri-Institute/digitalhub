import type { z } from "zod";
import { toast } from "#/components/ui/use-toast";
import type { QueuedStudentAttendanceSchema } from "#/app/(platform)/hc/schemas";
import { type SyncedStudentAttendance, syncStudentAttendance } from "#/lib/actions/student";

export type QueuedStudentAttendance = z.infer<typeof QueuedStudentAttendanceSchema>[number];
type UnsavedStudentAttendance = Exclude<SyncedStudentAttendance, { outcome: "saved" }>;

const DATABASE_NAME = "digitalhub-offline";
const STORE_NAME = "student-attendance";
const MARKS_PER_REQUEST = 500;

function openOutbox() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    // One queued mark per student and session: marking again replaces the queued mark.
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE_NAME, { keyPath: ["studentId", "sessionId"] });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function inOutbox(mode: IDBTransactionMode, work: (store: IDBObjectStore) => void) {
  const outbox = await openOutbox();
  return new Promise<void>((resolve, reject) => {
    const transaction = outbox.transaction(STORE_NAME, mode);
    work(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => {
      outbox.close();
      resolve();
    };
    transaction.onerror = transaction.onabort = () => {
      outbox.close();
      reject(transaction.error);
    };
  });
}

export function queueStudentAttendance(marks: QueuedStudentAttendance[]) {
  return inOutbox("readwrite", (store) => {
    for (const mark of marks) store.put(mark);
  });
}

export async function queuedStudentAttendance() {
  let marks: QueuedStudentAttendance[] = [];
  await inOutbox("readonly", (store) => {
    const request = store.getAll();
    request.onsuccess = () => {
      marks = request.result;
    };
  });
  return marks;
}

/** Removes the marks the server answered, unless the student was marked again since. */
function removeAnswered(answers: SyncedStudentAttendance[]) {
  return inOutbox("readwrite", (store) => {
    for (const { studentId, sessionId, markedAt } of answers) {
      const request = store.get([studentId, sessionId]);
      request.onsuccess = () => {
        if (request.result?.markedAt === markedAt) store.delete([studentId, sessionId]);
      };
    }
  });
}

/** Marks queued while a request is out are sent by the next one. */
async function sendQueue(
  unsaved: UnsavedStudentAttendance[] = [],
): Promise<UnsavedStudentAttendance[]> {
  const marks = await queuedStudentAttendance();
  if (marks.length === 0) return unsaved;
  const answers = await syncStudentAttendance(marks.slice(0, MARKS_PER_REQUEST));
  await removeAnswered(answers);
  return sendQueue([
    ...unsaved,
    ...answers.filter((answer): answer is UnsavedStudentAttendance => answer.outcome !== "saved"),
  ]);
}

async function sendAndReport() {
  for (const answer of await sendQueue()) {
    toast({ variant: "destructive", description: answer.message });
  }
}

let sending: Promise<void> | null = null;

/**
 * Sends the queued marks until none are left, one request at a time, and shows a toast for each
 * mark not saved: refused, or older than the stored mark. Keeps the queue and rejects when the
 * caller may not mark attendance or the request fails, as it does offline.
 */
export function sendQueuedStudentAttendance() {
  sending ??= sendAndReport().finally(() => {
    sending = null;
  });
  return sending;
}
