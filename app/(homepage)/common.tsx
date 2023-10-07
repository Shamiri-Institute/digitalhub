import { Icons } from "#/components/icons";
import { useSession } from "#/app/auth.client";

export function Header() {
  const session = useSession();
  console.log({ session: session.data?.user.name });

  return (
    <header className="mb-4">
      <div className="flex items-center">
        <h1 className="font-semibold text-2xl text-brand pr-3">
          Hello, {session.data?.user.name}
        </h1>
        <Icons.smileyface className="h-6 w-6 text-brand" />
      </div>
      <p className="text-muted-foreground text-xl">Have a nice day!</p>
    </header>
  );
}
