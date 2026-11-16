"use client";

import type { Tooltip as TooltipParts } from "@base-ui/react/tooltip";
import { useRender } from "@base-ui/react/use-render";
import { type ComponentProps, createContext, type ReactElement, type ReactNode, use } from "react";

import { afterPage } from "#/components/deferred";
import { cn } from "#/lib/utils";

// Base UI's Tooltip brings its positioning code, about 25 KB gzipped, into every page that shows a
// hint. A tooltip only matters once someone points at its trigger, so the trigger is drawn on its
// own until the code has loaded after the page.
const [useTooltipCode] = afterPage(() =>
  import("@base-ui/react/tooltip").then((mod) => mod.Tooltip),
);

const TooltipCode = createContext<typeof TooltipParts | null>(null);

function Tooltip(props: Omit<TooltipParts.Root.Props, "children"> & { children?: ReactNode }) {
  const Parts = useTooltipCode();
  return (
    <TooltipCode value={Parts}>{Parts ? <Parts.Root {...props} /> : props.children}</TooltipCode>
  );
}

// Only what a plain element also takes, so the stand-in draws the same element.
type TriggerProps = Omit<ComponentProps<"button">, "ref"> & { render?: ReactElement };

function TooltipTrigger({ render, ...props }: TriggerProps) {
  const Parts = use(TooltipCode);
  if (Parts) return <Parts.Trigger render={render} {...props} />;
  return <StandInTrigger render={render} {...props} />;
}

function StandInTrigger({ render, ...props }: TriggerProps) {
  return useRender({
    defaultTagName: "button",
    render,
    props: render ? props : { type: "button", ...props },
  });
}

function TooltipContent({
  className,
  side,
  align,
  sideOffset = 4,
  ...props
}: TooltipParts.Popup.Props &
  Pick<TooltipParts.Positioner.Props, "side" | "align" | "sideOffset">) {
  const Parts = use(TooltipCode);
  if (!Parts) return null;
  return (
    <Parts.Portal>
      <Parts.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <Parts.Popup
          data-slot="tooltip-content"
          className={cn(
            "overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </Parts.Positioner>
    </Parts.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
