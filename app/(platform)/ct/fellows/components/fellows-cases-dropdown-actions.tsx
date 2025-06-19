import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export default function FellowsClinicalCasesDropdownActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Edit supervisor information
          </div>
        </div>
        <div>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Monthly supervisor evaluation
          </div>
        </div>
        <div>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Submit complaint
          </div>
        </div>
        <div>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Overall supervisor evaluation
          </div>
        </div>
        <div>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-red">
            Drop-out supervisor
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
