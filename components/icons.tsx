import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  CalendarCheck2,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileDown,
  FileUp,
  FlagTriangleLeft,
  FlagTriangleRight,
  HelpCircle,
  Info,
  Loader2,
  type LucideIcon,
  type LucideProps,
  MinusCircle,
  MoreHorizontal,
  PlusCircle,
  Search,
  Settings,
  Ticket,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";

import { cn } from "#/lib/utils";

export type Icon = LucideIcon | React.FC<LucideProps>;

export const Icons = {
  minusCircle: MinusCircle,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  chevronLeft: ChevronLeft,
  ticket: Ticket,
  settings: Settings,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  search: Search,
  plusCircle: PlusCircle,
  moreHorizontal: MoreHorizontal,
  xIcon: XIcon,
  helpCircle: HelpCircle,
  alertCircle: AlertCircle,
  uploadCloudIcon: UploadCloudIcon,
  info: Info,
  calendarCheck2: CalendarCheck2,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  clock: Clock,
  flagTriangleLeft: FlagTriangleLeft,
  flagTriangleRight: FlagTriangleRight,
  loaderCircle: Loader2,
  fileDown: FileDown,
  fileUp: FileUp,

  // The One Shamiri logo from the brand file: the S mark and wordmark take the text colour, the
  // slash through the S stays lime.
  logo: ({ className, ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 195 48"
      aria-hidden
      className={cn("fill-current", className)}
      {...props}
    >
      <path d="M147.654 20.8725V46.8883H139.156V22.2733H130.382V46.8883H121.878V22.2733H113.108V46.8883H104.604V20.8883C104.604 16.7832 107.913 13.4586 111.999 13.4586H139.156V13.4402H140.265C144.348 13.4402 147.657 16.77 147.657 20.8699L147.654 20.8725Z" />
      <path d="M62.1961 20.8911V46.8805H53.6974V22.2761H43.3205V46.8805H34.8165V7.42982C34.8165 3.32469 38.1255 0.00012207 42.2114 0.00012207H42.8523C43.1086 0.00012207 43.3179 0.210372 43.3179 0.467928V13.4614H54.8039C58.8871 13.4614 62.1961 16.7859 62.1961 20.8911Z" />
      <path d="M183.011 20.6254V20.6622C183.011 20.7595 182.932 20.8409 182.833 20.8409H171.653V46.8804H163.149V13.9264C163.149 13.6688 163.356 13.4612 163.612 13.4612H175.878C179.814 13.4612 183.008 16.6675 183.008 20.6254H183.011Z" />
      <path d="M98.4345 21.0537C97.4379 19.3691 96.1875 17.8579 94.7436 16.5806C91.6831 13.9236 87.7149 12.3204 83.3806 12.3204C73.6942 12.3204 65.8416 20.3099 65.8416 30.1601C65.8416 40.0103 73.6942 48.0024 83.3806 48.0024C87.1735 48.0024 90.6917 46.7751 93.5586 44.6884V46.8829H101.118V30.9223C101.118 27.3086 100.135 23.9262 98.4371 21.0537H98.4345ZM83.3806 39.4794C78.3216 39.4794 74.2174 35.306 74.2174 30.1601C74.2174 25.0143 78.3216 20.8434 83.3806 20.8434C88.4395 20.8434 92.5385 25.0169 92.5385 30.1601C92.5385 35.3034 88.4343 39.4794 83.3806 39.4794Z" />
      <path d="M159.667 13.9263V46.8803H151.163V20.8909C151.163 16.7857 154.472 13.4612 158.557 13.4612H159.201C159.455 13.4612 159.664 13.6688 159.664 13.9263H159.667ZM155.432 3.12476C153.085 3.12476 151.181 5.04066 151.181 7.39808C151.181 9.7555 153.083 11.6688 155.432 11.6688C157.781 11.6688 159.682 9.75813 159.682 7.39808C159.682 5.03803 157.781 3.12476 155.432 3.12476Z" />
      <path d="M195.001 13.9265V46.8805H186.497V20.891C186.497 16.7859 189.811 13.4613 193.892 13.4613H194.535C194.792 13.4613 194.998 13.6689 194.998 13.9265H195.001ZM190.753 3.14331C188.407 3.14331 186.5 5.05395 186.5 7.41401C186.5 9.77406 188.407 11.6873 190.753 11.6873C193.099 11.6873 195.004 9.77143 195.004 7.41401C195.004 5.05658 193.102 3.14331 190.753 3.14331Z" />
      <path d="M21.7 12.2443L2.92904 31.1063L2.68577 30.8619C-0.895257 27.264 -0.895257 21.4296 2.68577 17.8343L14.9748 5.49001C15.1553 5.30867 15.4456 5.30867 15.6235 5.49001L21.7 11.5925C21.8805 11.7738 21.8805 12.0656 21.7 12.2443Z" />
      <path d="M28.48 34.1421L14.8439 47.8425C14.666 48.0212 14.3782 48.0212 14.1951 47.8425L8.11864 41.7374C7.94076 41.5587 7.94076 41.2643 8.11864 41.0856L28.242 20.8701L28.48 21.1093C32.061 24.7072 32.061 30.5442 28.48 34.1421Z" />
      <path
        className="fill-lime"
        d="M28.2428 20.8701L18.0568 31.104H2.92706L13.113 20.8701H28.2428Z"
      />
    </svg>
  ),
  paperFileText: ({ className, ...props }: LucideProps) => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M6 22H18C19.1046 22 20 21.1046 20 20V9.82843C20 9.29799 19.7893 8.78929 19.4142 8.41421L13.5858 2.58579C13.2107 2.21071 12.702 2 12.1716 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 2.5V9H19"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 17H15"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13H15"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9H9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  google: ({ className, ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 488 512"
      fill="currentColor"
      {...props}
      className={className}
    >
      <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
    </svg>
  ),
  starRating: ({ className, ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  crossCircleFilled: ({ className, ...props }: LucideProps) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.00033 0.666992C4.39199 0.666992 0.666992 4.39199 0.666992 9.00033C0.666992 13.6087 4.39199 17.3337 9.00033 17.3337C13.6087 17.3337 17.3337 13.6087 17.3337 9.00033C17.3337 4.39199 13.6087 0.666992 9.00033 0.666992ZM12.5837 12.5837C12.2587 12.9087 11.7337 12.9087 11.4087 12.5837L9.00033 10.1753L6.59199 12.5837C6.26699 12.9087 5.74199 12.9087 5.41699 12.5837C5.09199 12.2587 5.09199 11.7337 5.41699 11.4087L7.82533 9.00033L5.41699 6.59199C5.09199 6.26699 5.09199 5.74199 5.41699 5.41699C5.74199 5.09199 6.26699 5.09199 6.59199 5.41699L9.00033 7.82533L11.4087 5.41699C11.7337 5.09199 12.2587 5.09199 12.5837 5.41699C12.9087 5.74199 12.9087 6.26699 12.5837 6.59199L10.1753 9.00033L12.5837 11.4087C12.9003 11.7253 12.9003 12.2587 12.5837 12.5837Z"
        fill="currentColor"
      />
    </svg>
  ),
  checkCircle: ({ className, ...props }: LucideProps) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0003 1.66699C5.40033 1.66699 1.66699 5.40033 1.66699 10.0003C1.66699 14.6003 5.40033 18.3337 10.0003 18.3337C14.6003 18.3337 18.3337 14.6003 18.3337 10.0003C18.3337 5.40033 14.6003 1.66699 10.0003 1.66699ZM10.0003 16.667C6.32533 16.667 3.33366 13.6753 3.33366 10.0003C3.33366 6.32533 6.32533 3.33366 10.0003 3.33366C13.6753 3.33366 16.667 6.32533 16.667 10.0003C16.667 13.6753 13.6753 16.667 10.0003 16.667ZM13.2337 6.90866L8.33366 11.8087L6.76699 10.242C6.44199 9.91699 5.91699 9.91699 5.59199 10.242C5.26699 10.567 5.26699 11.092 5.59199 11.417L7.75033 13.5753C8.07533 13.9003 8.60033 13.9003 8.92533 13.5753L14.417 8.08366C14.742 7.75866 14.742 7.23366 14.417 6.90866C14.092 6.58366 13.5587 6.58366 13.2337 6.90866Z"
        fill="currentColor"
      />
    </svg>
  ),
};
