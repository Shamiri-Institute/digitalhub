import { cn } from "#/lib/utils";
import * as React from "react";

import { Icons } from "#/components/icons";

export function Breadcrumbs({ crumbs }: { crumbs: string[] }) {
  const [first, ...rest] = crumbs;
  const textStyles = "font-medium text-2xl text-foreground hidden md:block";
  return (
    <nav className="flex items-center md:space-x-2 text-sm">
      <div className={textStyles}>{first}</div>
      {rest.map((crumb, i) => (
        <React.Fragment key={crumb}>
          <Icons.chevronRight className="h-4 w-4 text-muted-foreground hidden md:block" />
          <span
            className={cn(textStyles, {
              block: i === rest.length - 1,
            })}
          >
            {crumb}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}
