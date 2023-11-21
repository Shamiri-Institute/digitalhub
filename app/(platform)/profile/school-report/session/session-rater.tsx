import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";

export function SessionRater() {
  return (
    <div className="mt-4 px-6">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger
            className={"items-right border border-border/50 bg-white px-5"}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.startOutline className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle"> Ratings</span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className="pt-4">
              <div className="flex items-center justify-between ">
                <p className="text-sm font-normal text-brand">
                  Student behavior
                </p>
                <div className="flex flex-1  justify-end">
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Admin support</p>
                <div className="flex flex-1  justify-end">
                  <div>
                    <Icons.star className="h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7" />
                  </div>
                  <Icons.star className="ml-4 h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7" />
                  <Icons.star className="ml-4 h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Workload</p>
                <div className="flex flex-1  justify-end">
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="mt-4" />
    </div>
  );
}
