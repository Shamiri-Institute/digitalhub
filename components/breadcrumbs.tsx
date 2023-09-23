import { cn } from "#/lib/utils";
import * as React from "react";

import { Icons } from "#/components/icons";

export function Breadcrumbs({ crumbs }: { crumbs: string[] }) {
  const [first, ...rest] = crumbs;
  const textStyles = "font-medium text-2xl text-foreground";
  return (
    <nav className="flex items-center space-x-2 text-sm">
      <div className={textStyles}>{first}</div>
      {rest.map((crumb, i) => (
        <React.Fragment key={crumb}>
          <Icons.chevronRight className="h-4 w-4 text-gray-500" />
          <span className={cn(textStyles)}>{crumb}</span>
        </React.Fragment>
      ))}
    </nav>
  );
}
