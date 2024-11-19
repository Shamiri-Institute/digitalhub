"use client";

import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";

export default function SchoolsBreadcrumb() {
  const context = useContext(SchoolsDataContext);
  const pathname = usePathname();
  const router = useRouter();
  const schoolVisibleId = pathname.split("/")[3];
  const _school = context.schools.findIndex((school) => {
    return school.visibleId === schoolVisibleId;
  });
  const [selectedSchoolIndex, setSelectedSchoolIndex] = useState(_school);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const routeArray = pathname.split("/");
    routeArray[3] = context.schools[selectedSchoolIndex]?.visibleId!;
    router.push(routeArray.join("/"));
  }, [selectedSchoolIndex]);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-x-5 text-shamiri-text-dark-grey">
        <div
          className="flex cursor-pointer items-center justify-center rounded-lg border p-3 hover:text-shamiri-new-blue hover:drop-shadow active:scale-95"
          onClick={() => {
            router.back();
          }}
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Link href="/hc/schools" className="hover:text-shamiri-new-blue">
            Schools
          </Link>
          <span>/</span>
          <span className="text-shamiri-text-dark-grey">
            {context.schools[selectedSchoolIndex]?.schoolName}
          </span>
          {loading && (
            <Icons.hourglass className="h-3.5 w-3.5 animate-bounce text-shamiri-new-blue" />
          )}
        </div>
        <div className="flex">
          <div
            className={cn(
              "arrow-button rounded-l-lg",
              selectedSchoolIndex === 0 || loading
                ? "pointer-events-none opacity-50"
                : "",
            )}
            onClick={() => {
              if (selectedSchoolIndex !== 0) {
                setSelectedSchoolIndex(selectedSchoolIndex - 1);
              }
            }}
          >
            <Icons.arrowUp className="h-4 w-4" />
          </div>
          <div
            className={cn(
              "arrow-button rounded-r-lg",
              selectedSchoolIndex === context.schools.length - 1
                ? "pointer-events-none opacity-50"
                : "",
            )}
            onClick={() => {
              if (
                loading ||
                selectedSchoolIndex !== context.schools.length - 1
              ) {
                setSelectedSchoolIndex(selectedSchoolIndex + 1);
              }
            }}
          >
            <Icons.arrowDown className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
