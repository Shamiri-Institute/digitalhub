"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { createContext, use, useId } from "react";

import { cn } from "#/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

// Base UI leaves a tooltip out of the accessibility tree; the trigger points at the open popup so
// assistive technology reads the tooltip as the trigger's description.
const TooltipIdContext = createContext<string | undefined>(undefined);

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return (
    <TooltipIdContext value={useId()}>
      <TooltipPrimitive.Root {...props} />
    </TooltipIdContext>
  );
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger aria-describedby={use(TooltipIdContext)} {...props} />;
}

function TooltipContent({
  className,
  align = "center",
  side = "top",
  sideOffset = 4,
  ...props
}: Omit<TooltipPrimitive.Popup.Props, "className"> &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset"> & {
    className?: string;
  }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          id={use(TooltipIdContext)}
          role="tooltip"
          className={cn(
            "z-50 origin-(--transform-origin) overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground data-open:animate-in data-open:fade-in-0 data-open:motion-safe:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:motion-safe:zoom-out-95 data-[side=bottom]:motion-safe:slide-in-from-top-2 data-[side=left]:motion-safe:slide-in-from-right-2 data-[side=right]:motion-safe:slide-in-from-left-2 data-[side=top]:motion-safe:slide-in-from-bottom-2",
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
