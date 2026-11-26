import { ParseError, parsePhoneNumberWithError } from "libphonenumber-js";
import { Icons } from "#/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";

export default function RenderParsedPhoneNumber(number?: string) {
  try {
    return number && parsePhoneNumberWithError(number, "KE").formatInternational();
  } catch (error) {
    if (error instanceof ParseError) {
      return (
        number && (
          <Popover>
            <PopoverTrigger openOnHover className="flex gap-1 rounded-sm">
              <Icons.flagTriangleRight aria-hidden className="h-4 w-4 text-shamiri-red" />
              <span>{number}</span>
            </PopoverTrigger>
            <PopoverContent className="w-auto px-3 py-2 text-xs capitalize">
              {error.message.toLowerCase().replace("_", " ")}
            </PopoverContent>
          </Popover>
        )
      );
    }
    throw error;
  }
}
