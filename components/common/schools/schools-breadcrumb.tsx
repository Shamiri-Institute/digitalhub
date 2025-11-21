"use client";

import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { Icons } from "#/components/icons";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { fetchImplementerSchools } from "#/lib/actions/implementer";
import { fetchHubSchools } from "#/lib/actions/school";
import { cn } from "#/lib/utils";
import { ImplementerRole, Prisma } from "@prisma/client";
import { CheckIcon } from "@radix-ui/react-icons";
import { ChevronsUpDown } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type School = Prisma.SchoolGetPayload<{
  select: {
    visibleId: true;
    schoolName: true;
    hub: {
      select: {
        hubName: true;
      };
    };
  };
}>;

export default function SchoolsBreadcrumb() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const schoolVisibleId = pathname.split("/")[3];

  const [schools, setSchools] = useState<School[]>([]);
  const selectedSchool = schools.find((school) => school.visibleId === schoolVisibleId);
  const [loading, setLoading] = useState(false);

  const role = session?.user?.activeMembership?.role;
  const implementerId = session?.user?.activeMembership?.implementerId;

  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      if (implementerId && role === ImplementerRole.ADMIN) {
        const response = await fetchImplementerSchools(implementerId);
        if (response.success && response.data) {
          setSchools(response.data);
        }
      }
      if (
        role === ImplementerRole.HUB_COORDINATOR ||
        role === ImplementerRole.SUPERVISOR ||
        role === ImplementerRole.FELLOW
      ) {
        const response = await fetchHubSchools();
        if (response.success && response.data) {
          setSchools(response.data);
        }
      }
      setLoading(false);
    };
    fetchSchools();
  }, [implementerId, role]);

  const handleSchoolSelect = (schoolVisibleId: string) => {
    const routeArray = pathname.split("/");
    routeArray[3] = schoolVisibleId;
    router.replace(routeArray.join("/"));
  };

  useEffect(() => {
    revalidatePageAction(pathname);
  }, [pathname]);

  const schoolIndex = schools.findIndex((school) => school.visibleId === schoolVisibleId);
  const previousSchool = schools[schoolIndex - 1];
  const nextSchool = schools[schoolIndex + 1];

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-x-5 text-shamiri-text-dark-grey">
        <button
          type="button"
          className="flex cursor-pointer items-center justify-center rounded-lg border p-3 hover:text-shamiri-new-blue hover:drop-shadow active:scale-95"
          onClick={() => {
            router.back();
          }}
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-gray-400">
          <Link
            href={
              role === "HUB_COORDINATOR"
                ? "/hc/schools"
                : role === "SUPERVISOR"
                  ? "/sc/schools"
                  : role === "FELLOW"
                    ? "/fel/schools"
                    : role === "ADMIN"
                      ? `/admin/hubs`
                      : "#"
            }
            className="hover:text-shamiri-new-blue"
          >
            {role === "ADMIN" ? "Hubs" : "Schools"}
          </Link>
          {role === "ADMIN" && (
            <>
              <span>/</span>
              <span className="text-shamiri-text-dark-grey">{selectedSchool?.hub?.hubName}</span>
            </>
          )}
          <span>/</span>
          <Popover>
            <PopoverTrigger asChild className="flex cursor-pointer items-center gap-2">
              <div className="flex items-center gap-2 text-shamiri-text-dark-grey">
                {selectedSchool?.schoolName}
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              {schools ? (
                <Command>
                  <span className="px-4 pb-1 pt-2 text-[9px] uppercase tracking-widest text-muted-foreground">
                    switch school
                  </span>
                  <CommandSeparator />
                  <CommandInput placeholder="Search schools..." className="h-9" />
                  <CommandList className="max-h-[300px] overflow-y-scroll">
                    {schools.map((school) => (
                      <CommandItem
                        key={school.visibleId}
                        value={school.schoolName}
                        onSelect={() => handleSchoolSelect(school.visibleId)}
                        className="flex items-center justify-between gap-3 rounded-none border-b border-gray-200 px-3 last:border-b-0"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{school.schoolName}</span>
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground text-shamiri-new-blue">
                            {school.hub?.hubName ?? "No Hub"}
                          </span>
                        </div>
                        <CheckIcon
                          className={cn(
                            "h-4 w-4",
                            selectedSchool?.visibleId === school.visibleId
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              ) : null}
            </PopoverContent>
          </Popover>
          {loading && (
            <Icons.hourglass className="h-3.5 w-3.5 animate-bounce text-shamiri-new-blue" />
          )}
        </div>
      </div>
      <div className="hidden lg:flex">
        <button
          type="button"
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
