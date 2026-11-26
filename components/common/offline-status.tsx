"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sendQueuedStudentAttendance } from "#/lib/offline/student-attendance-outbox";

// A phone in a dead zone can report itself online, so the queue is also retried on a timer.
const RETRY_INTERVAL_MS = 30_000;

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function sendQueue() {
  sendQueuedStudentAttendance().catch(() => {});
}

export function OfflineStatus() {
  const isOffline = useSyncExternalStore(
    subscribeToConnection,
    () => !navigator.onLine,
    () => false,
  );

  // Sends marks queued on this phone, including those a killed tab left, when the page opens, when
  // the connection returns, and on a timer.
  // effect: subscribes to the online event and a retry timer.
  useEffect(() => {
    sendQueue();
    window.addEventListener("online", sendQueue);
    const retry = window.setInterval(sendQueue, RETRY_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", sendQueue);
      window.clearInterval(retry);
    };
  }, []);

  if (!isOffline) return null;
  return (
    <output className="border-shamiri-light-orange/30 bg-shamiri-light-orange/10 text-shamiri-dark-orange block border-b px-4 py-2 text-sm">
      You are offline. Attendance you mark is kept on this phone and sent when the connection
      returns.
    </output>
  );
}
