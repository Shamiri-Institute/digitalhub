import { Icons } from "#/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { ParseError, parsePhoneNumberWithError } from "libphonenumber-js";

export default function RenderParsedPhoneNumber(number?: string) {
  try {
    return (
      number && parsePhoneNumberWithError(number, "KE").formatInternational()
    );
  } catch (error) {
    if (error instanceof ParseError) {
      // Not a phone number, non-existent country, etc.
      return (
        number && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex gap-1">
                <Icons.flagTriangleRight className="h-4 w-4 text-shamiri-red" />
                <span>{number}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="px-2 py-1 capitalize">
                {error.message.toLowerCase().replace("_", " ")}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      );
    }
      throw error;
  }
}
