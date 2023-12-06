"use client";

import { useQueryState } from "next-usequerystate";
import * as React from "react";

import { FellowSwitcher } from "#/app/(platform)/fellows/sessions/fellow-switcher";
import { CurrentSupervisor } from "#/app/auth";
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

  return (
    <>
      <div className="flex justify-center">
        <div className="w-[min(200px,90vw)]">
          <FellowSwitcher
            fellowVisibleId={fellowId}
            setFellowVisibleId={setFellowId}
            fellows={fellows}
          />
        </div>
      </div>
    </>
  );
}
