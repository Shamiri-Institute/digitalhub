"use client";

import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "#/components/icons";
import { deferred } from "#/components/deferred";
import type { BreadcrumbSchool } from "#/components/common/schools/school-view-layout";
import type { ImplementerRole } from "#/db/enums";
import { cn } from "#/lib/utils";

// The switcher pulls in cmdk and Base UI's Popover, so it loads after the page; its trigger is
// drawn until then.
const SchoolSwitcher = deferred(() =>
  import("#/components/common/schools/school-switcher").then((mod) => mod.SchoolSwitcher),
);

export default function SchoolsBreadcrumb({
  schools,
  role,
}: {
  schools: BreadcrumbSchool[];
  role: ImplementerRole | undefined;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const schoolVisibleId = pathname.split("/")[3];

  const selectedSchool = schools.find((school) => school.visibleId === schoolVisibleId);

  const handleSchoolSelect = (schoolVisibleId: string) => {
    const routeArray = pathname.split("/");
    routeArray[3] = schoolVisibleId;
    router.replace(routeArray.join("/"));
  };

  const schoolIndex = schools.findIndex((school) => school.visibleId === schoolVisibleId);
  const previousSchool = schools[schoolIndex - 1];
  const nextSchool = schools[schoolIndex + 1];

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-x-5 text-muted-foreground">
        <button
          type="button"
          aria-label="Back"
          className="flex cursor-pointer items-center justify-center rounded-lg border p-3 hover:text-primary hover:drop-shadow-sm active:scale-95"
          onClick={() => {
            router.back();
          }}
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Link
            href={
              role === "HUB_COORDINATOR"
                ? "/hc/schools"
                : role === "SUPERVISOR"
                  ? "/sc/schools"
                  : role === "FELLOW"
                    ? "/fel/schools"
                    : role === "ADMIN"
                      ? "/admin/hubs"
                      : "#"
            }
            className="hover:text-primary"
          >
            {role === "ADMIN" ? "Hubs" : "Schools"}
          </Link>
          {role === "ADMIN" && (
            <>
              <span>/</span>
              <span className="text-muted-foreground">{selectedSchool?.hub?.hubName}</span>
            </>
          )}
          <span>/</span>
          <SchoolSwitcher
            trigger={
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 text-muted-foreground"
              >
                {selectedSchool?.schoolName}
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            }
            schools={schools}
            selectedVisibleId={selectedSchool?.visibleId}
            onSelect={handleSchoolSelect}
          />
        </div>
      </div>
      <div className="hidden lg:flex">
        <button
          type="button"
          aria-label="Previous school"
          disabled={schoolIndex === 0}
          className={cn(
            "arrow-button rounded-l-lg",
            schoolIndex === 0 ? "pointer-events-none opacity-50" : "",
          )}
          onClick={() => {
            if (previousSchool && schoolIndex !== 0) {
              handleSchoolSelect(previousSchool.visibleId);
            }
          }}
        >
          <Icons.arrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next school"
          disabled={schoolIndex === schools.length - 1}
          className={cn(
            "arrow-button rounded-r-lg",
            schoolIndex === schools.length - 1 ? "pointer-events-none opacity-50" : "",
          )}
          onClick={() => {
            if (nextSchool) {
              handleSchoolSelect(nextSchool.visibleId);
            }
          }}
        >
          <Icons.arrowDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
