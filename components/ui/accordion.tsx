"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "#/lib/utils";

const Accordion = AccordionPrimitive.Root;

function AccordionItem({
  className,
  ...props
}: Omit<AccordionPrimitive.Item.Props, "className"> & { className?: string }) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={className} {...props} />;
}

function AccordionTrigger({
  className,
  children,
  iconClass,
  ...props
}: Omit<AccordionPrimitive.Trigger.Props, "className"> & {
  className?: string;
  iconClass?: string;
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-center gap-4 py-4 text-sm font-medium transition-all data-panel-open:[&>div>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        <div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              iconClass,
            )}
          />
        </div>
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: Omit<AccordionPrimitive.Panel.Props, "className"> & { className?: string }) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden text-sm transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none"
      {...props}
    >
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
