"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { cn } from "#/lib/utils";

export type TabType = {
  name: string;
  href: string;
};

export default function TabToggleNavigation({
  options,
  className,
}: {
  options: TabType[];
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = options.find((tab) => tab.href === pathname) || options[0];

  // effect: redirects to the first tab when the route matches none of the options
  useEffect(() => {
    const firstOption = options[0];
    if (!options.find((tab) => tab.href === pathname) && firstOption) {
      router.push(firstOption.href);
    }
  }, [pathname, options, router]);

  return (
    <div className={cn("container flex", className)}>
      <ToggleGroup
        className="form-toggle"
        defaultValue={currentTab?.name ?? ""}
        onValueChange={(value) => {
          if (value) {
            const tab = options.find((tab) => tab.name === value);
            if (tab) {
              router.push(tab.href);
            }
          }
        }}
      >
        {options.map((option) => {
          return (
            <ToggleGroupItem
              key={option.name}
              value={option.name}
              aria-label={`Select ${option.name}`}
              data-leave-href={option.href}
              className="form-toggle-button text-nowrap"
            >
              {option.name}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
