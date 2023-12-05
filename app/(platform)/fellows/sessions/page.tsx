"use client";

import { useQueryState } from "next-usequerystate";
import Link from "next/link";
import * as React from "react";

import { fetchFellow } from "#/app/actions";
import { Icons } from "#/components/icons";

export default function FellowSessionsPage() {
  const [fellowId, setFellowId] = useQueryState("fid");
  const [fellow, setFellow] = React.useState<Awaited<
    ReturnType<typeof fetchFellow>
  > | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function getFellow() {
      if (!fellowId) return;
      setLoading(false);
      const fellow = await fetchFellow(fellowId);
      setFellow(fellow);
      setLoading(true);
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
    <main>
      <Header />
      <FellowSwitcher fellowId={fellowId} setFellowId={setFellowId} />
      <button
        onClick={() => {
          setFellowId(
            `new-fid-${Math.floor(Math.random() * 16777215).toString(8)}`,
          );
        }}
      >
        {loading ? "loading" : "Change fid"}
      </button>
    </main>
  );
}

function FellowSwitcher({
  fellowId,
  setFellowId,
}: {
  fellowId: string;
  setFellowId: (fid: string) => void;
}) {
  return <div>{fellowId}</div>;
}

function Header() {
  return (
    <header className="my-4">
      <div className="flex items-center justify-between">
        <Link href="/profile">
          <Icons.chevronLeft className="h-5 w-5 text-brand" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Sessions Attended</h1>
        <div className="h-5 w-5"></div>
      </div>
    </header>
  );
}
