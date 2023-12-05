"use client";

import { useQueryState } from "next-usequerystate";
import * as React from "react";

import type { CurrentSupervisor } from "#/app/auth";
import { fetchFellow } from "#/lib/actions/fetch-fellow";

export function SessionHistory({
  fellows,
}: {
  fellows: NonNullable<CurrentSupervisor>["fellows"];
}) {
  const [fellowId, setFellowId] = useQueryState("fid");
  const [fellow, setFellow] = React.useState<Awaited<
    ReturnType<typeof fetchFellow>
  > | null>(null);

  React.useEffect(() => {
    async function getFellow() {
      if (!fellowId) return;
      const fellow = await fetchFellow(fellowId);
      setFellow(fellow);
    }

    getFellow();
  }, [fellowId]);

  if (!fellowId) {
    return (
      <div>
        <h1>No fellow specified</h1>
      </div>
    );
  }

  return (
    <>
      <FellowSwitcher
        fellowId={fellowId}
        setFellowId={setFellowId}
        fellows={fellows}
      />
      <button
        onClick={() => {
          setFellowId(
            `new-fid-${Math.floor(Math.random() * 16777215).toString(8)}`,
          );
        }}
      >
        Change fid
      </button>
    </>
  );
}
export function FellowSwitcher({
  fellowId,
  setFellowId,
  fellows,
}: {
  fellowId: string;
  setFellowId: (fid: string) => void;
  fellows: NonNullable<CurrentSupervisor>["fellows"];
}) {
  return <div>{fellowId}</div>;
}
