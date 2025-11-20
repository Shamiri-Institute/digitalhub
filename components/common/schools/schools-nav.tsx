"use client";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

type TabType = {
  name: string;
  href: string;
};

export default function SchoolsNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.activeMembership?.role;
  const visibleId = pathname.split("/")[3];

  const options: TabType[] =
    role === "ADMIN"
      ? [
          { name: "Sessions", href: `/admin/schools/${visibleId}/sessions` },
          {
            name: "Supervisors",
            href: `/admin/schools/${visibleId}/supervisors`,
          },
          { name: "Fellows", href: `/admin/schools/${visibleId}/fellows` },
          { name: "Students", href: `/admin/schools/${visibleId}/students` },
          { name: "Groups", href: `/admin/schools/${visibleId}/groups` },
          { name: "Files", href: `/admin/schools/${visibleId}/files` },
        ]
      : role === "HUB_COORDINATOR"
        ? [
            { name: "Sessions", href: `/hc/schools/${visibleId}/sessions` },
            {
              name: "Supervisors",
              href: `/hc/schools/${visibleId}/supervisors`,
            },
            { name: "Fellows", href: `/hc/schools/${visibleId}/fellows` },
            { name: "Students", href: `/hc/schools/${visibleId}/students` },
            { name: "Groups", href: `/hc/schools/${visibleId}/groups` },
            { name: "Files", href: `/hc/schools/${visibleId}/files` },
          ]
        : role === "SUPERVISOR"
          ? [
              { name: "Sessions", href: `/sc/schools/${visibleId}/sessions` },
              { name: "Fellows", href: `/sc/schools/${visibleId}/fellows` },
              { name: "Students", href: `/sc/schools/${visibleId}/students` },
              { name: "Groups", href: `/sc/schools/${visibleId}/groups` },
              // { name: "Files", href: `/sc/schools/${visibleId}/files` },
              // { name: "Clinical Cases", href: `/sc/schools/${visibleId}/cases` },
              // { name: "Referrals", href: `/sc/schools/${visibleId}/referrals` },
              // { name: "Consulting", href: `/sc/schools/${visibleId}/consulting` },
            ]
          : role === "FELLOW"
            ? [
                {
                  name: "Sessions",
                  href: `/fel/schools/${visibleId}/sessions`,
                },
                { name: "Group", href: `/fel/schools/${visibleId}/group` },
                {
                  name: "Students",
                  href: `/fel/schools/${visibleId}/students`,
                },
                { name: "Files", href: `/fel/schools/${visibleId}/files` },
              ]
            : [];

  return (
    <div className="flex">
      <ToggleGroup
        type="single"
        className="form-toggle"
        defaultValue={options.find((tab) => tab.href === pathname)?.name}
        onValueChange={(value) => {
          if (value) {
            const tab = options.find((tab) => tab.name === value);
            router.push(tab!.href);
          }
        }}
      >
        {options.map((option) => {
          return (
            <ToggleGroupItem
              key={option.name}
              value={option.name}
              aria-label={`Select ${option.name}`}
              className="form-toggle-button"
            >
              <span className="text-nowrap">{option.name}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
