import { SchoolFilesTableData } from "#/app/(platform)/hc/schools/[visibleId]/files/components/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Dispatch, SetStateAction } from "react";

export default function SchoolFilesDataTableMenu({
  state,
  file,
}: {
  state: {
    setRenameDialog: Dispatch<SetStateAction<boolean>>;
    setDeleteDialog: Dispatch<SetStateAction<boolean>>;
    setFile: Dispatch<SetStateAction<SchoolFilesTableData | null>>;
  };
  file: SchoolFilesTableData;
}) {
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
        <DropdownMenuItem
          onClick={() => {
            state.setFile(file);
            // TODO: PREVIEW FILE ON NEW PAGE
          }}
        >
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            state.setFile(file);
            state.setRenameDialog(true);
          }}
        >
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            state.setFile(file);
            // TODO: TRIGGER DOWNLOAD
          }}
        >
          Download file
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            state.setFile(file);
            state.setDeleteDialog(true);
          }}
        >
          <div className="text-shamiri-red">Remove</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
