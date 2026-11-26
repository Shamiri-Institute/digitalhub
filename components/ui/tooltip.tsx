"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "#/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

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
