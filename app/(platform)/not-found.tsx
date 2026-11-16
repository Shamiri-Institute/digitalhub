import Link from "next/link";
import { getCurrentUserSession } from "#/app/auth";
import { buttonVariants } from "#/components/ui/button";
import { roleHome } from "#/lib/auth/role-home";

export default async function PlatformNotFound() {
  const session = await getCurrentUserSession();
  const viewerRole = session?.user.activeMembership?.role;

  return (
    <div className="flex w-full items-start justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-white">
        <div className="space-y-3 px-6 py-6 text-center sm:px-12">
          <h1 className="text-xl font-bold text-primary">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            This page could not be found. Check the address, or go back to your home page.
          </p>
        </div>
        <div className="border-t px-6 py-6 sm:px-12">
          <Link
            href={viewerRole ? roleHome[viewerRole] : "/"}
            className={buttonVariants({ className: "w-full" })}
          >
            Go to home page
          </Link>
        </div>
      </div>
    </div>
  );
}
