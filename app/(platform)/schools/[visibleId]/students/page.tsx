import { Icons } from "#/components/icons";

export default function SchoolStudentsPage() {
  return (
    <main>
      <Header />
    </main>
  );
}

function Header() {
  return (
    <header className="flex justify-between">
      <button>
        <Icons.chevronLeft className="mr-4 h-6 w-6 align-baseline text-brand" />
      </button>
      <div>
        <div>School name</div>
        <div>Fellow name</div>
      </div>
      <div className="flex gap-2">
        <Icons.search className="h-6 w-6 text-brand" strokeWidth={1.75} />
      </div>
    </header>
  );
}
