import Link from "next/link";

import { cn } from "#/lib/utils";

export default function FellowsPage() {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Fellows</h1>
      <div>
        <Link
          href="/fellows/sessions"
          className={cn(
            "rounded-md bg-brand px-2 py-2 font-medium text-white",
            "",
          )}
        >
          Sessions History
        </Link>
      </div>
    </main>
  );
}
