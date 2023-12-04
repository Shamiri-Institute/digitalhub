"use client";

import { useQueryState } from "next-usequerystate";

export default function FellowSessionsPage() {
  const [fellowId, setFellowId] = useQueryState("fid");

  if (!fellowId) {
    return (
      <div>
        <h1>No fellow specified</h1>
      </div>
    );
  }

  return (
    <main>
      <h1>Fellow {fellowId}&apos;s sessions</h1>
      <button
        onClick={() => {
          setFellowId(
            `new-fid-${Math.floor(Math.random() * 16777215).toString(8)}`,
          );
        }}
      >
        Change fid
      </button>
    </main>
  );
}
