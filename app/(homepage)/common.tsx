import { fetchAuthedUser } from "#/auth";
import { Icons } from "#/components/icons";

export async function Header() {
  const authedUser = await fetchAuthedUser();

  return (
    <header className="mb-4">
      <div className="flex items-center">
        <h1 className="font-semibold text-2xl text-brand pr-3">
          Hello, {authedUser.name}
        </h1>
        <Icons.smileyface className="h-6 w-6 text-brand" />
      </div>
      <p className="text-muted-foreground text-xl">Have a nice day!</p>
    </header>
  );
}
