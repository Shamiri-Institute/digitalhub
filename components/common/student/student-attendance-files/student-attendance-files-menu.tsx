import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import type { StudentAttendanceFileData } from "#/lib/actions/file/student-attendance";

export default function StudentAttendanceFilesMenu({ file }: { file: StudentAttendanceFileData }) {
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
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (file.link) {
              window.open(file.link, "_blank", "noopener,noreferrer");
            }
          }}
        >
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (file.link) {
              const link = document.createElement("a");
              link.href = file.link;
              link.download = "";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }}
        >
          Download file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
