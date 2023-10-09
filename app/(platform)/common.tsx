"use client";

import { useSession } from "#/app/auth.client";
import { Icons } from "#/components/icons";

export function Header() {
  const session = useSession();
  console.log({ session: session.data?.user.name });

  return (
    <header className="mb-4">
      <div className="flex items-center">
        <h1 className="pr-3 text-2xl font-semibold text-brand">
          Hello, {session.data?.user.name}
        </h1>
        <Icons.smileyface className="h-6 w-6 text-brand" />
      </div>
      <p className="text-xl text-muted-foreground">Have a nice day!</p>
    </header>
  );
}
