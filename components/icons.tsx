import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Backpack,
  Banknote,
  Calendar,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Clock,
  Eye,
  FileDown,
  FileUp,
  FlagTriangleLeft,
  FlagTriangleRight,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Hourglass,
  Info,
  LayoutDashboard,
  ListTodo,
  Loader2,
  // StarIcon,
  type LucideIcon,
  type LucideProps,
  Mail,
  MinusCircle,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Network,
  PencilLineIcon,
  PieChart,
  PlusCircle,
  RefreshCw,
  Search,
  Settings,
  Smile,
  Star,
  SunMedium,
  UploadCloudIcon,
  Users2,
  XIcon,
} from "lucide-react";
import type * as React from "react";

import { cn } from "#/lib/utils";

export type Icon = LucideIcon | React.FC<LucideProps>;

export const Icons = {
  sun: SunMedium,
  moon: Moon,
  minusCircle: MinusCircle,
  calendar: Calendar,
  check: Check,
  chevronsUpDown: ChevronsUpDown,
  chevronLeft: ChevronLeft,
  graduationCap: GraduationCap,
  backpack: Backpack,
  users2: Users2,
  listTodo: ListTodo,
  settings: Settings,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  search: Search,
  layoutDashboard: LayoutDashboard,
  clipboardList: ClipboardList,
  banknote: Banknote,
  network: Network,
  pieChart: PieChart,
  mail: Mail,
  plusCircle: PlusCircle,
  moreHorizontal: MoreHorizontal,
  moreVertical: MoreVertical,
  xIcon: XIcon,
  starOutline: Star,
  heartPulse: HeartPulse,
  helpCircle: HelpCircle,
  alertCircle: AlertCircle,
  uploadCloudIcon: UploadCloudIcon,
  PencilLine: PencilLineIcon,
  hourglass: Hourglass,
  info: Info,
  calendarCheck2: CalendarCheck2,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  clock: Clock,
  eye: Eye,
  refreshCw: RefreshCw,
  flagTriangleLeft: FlagTriangleLeft,
  flagTriangleRight: FlagTriangleRight,
  loaderCircle: Loader2,
  fileDown: FileDown,
  fileUp: FileUp,

  // star: StarIcon,
  logo: ({ className, ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 608.82 76.82"
      className={cn("fill-sky-600", className)}
      {...props}
    >
      <g>
        <g>
          <path d="M38.41,76.82a39.13,39.13,0,0,1-7-.63,39.23,39.23,0,1,1,7,.63Zm0-74.45a36,36,0,0,0-6.58,71.49,36.6,36.6,0,0,0,13.2,0A36,36,0,0,0,38.41,2.37Z" />
          <path d="M46.43,75,44.06,75a43.18,43.18,0,0,1,1.2-9l2.3.56A40.39,40.39,0,0,0,46.43,75Z" />
          <path d="M49.23,61.18,47,60.32a46.33,46.33,0,0,1,6-10.89,18,18,0,0,0,3.59-10.85,18.27,18.27,0,0,0-18-18.22h-.18a18.3,18.3,0,0,0-18.22,18.1,18.27,18.27,0,0,0,6.52,12.63c3.32,2.51,7.45,3.09,12.28,1.7l.67,2.27C34.1,56.67,29.24,56,25.3,53c-5.62-4.25-7.47-11.75-7.46-14.52A20.59,20.59,0,1,1,55,50.84,43.84,43.84,0,0,0,49.23,61.18Z" />
          <path d="M30.43,75a39.83,39.83,0,0,0-1.06-8.53l2.3-.54a41.88,41.88,0,0,1,1.13,9Z" />
          <path d="M27.74,61.25a42.7,42.7,0,0,0-2.35-5l2.08-1.14a43.49,43.49,0,0,1,2.47,5.32Z" />
          <path d="M39.68,55.06,39,52.8c1.71-.53,3.58-2.22,3.62-4v-.07A3.63,3.63,0,0,1,44.31,46a4.5,4.5,0,0,0,.43-.36c0-.21-.09-.43-.14-.66-.32-1.37-.85-3.65,1.38-5a8.27,8.27,0,0,0,2.18-2.29c-1.25.07-2.92-.25-4.24-2.75a11.58,11.58,0,0,1-1.07-3.11,3.9,3.9,0,0,0-.31-1,1.19,1.19,0,0,0-.54-.11,11.06,11.06,0,0,1-2.59-.43l-.42-.1a1.68,1.68,0,0,1-.94.71c-1.25.38-3-.64-4-1.29l-.62-.42.07-.47a2.6,2.6,0,0,0-.76,0H32.7a7.4,7.4,0,0,0-6,3.84,3.76,3.76,0,0,0-.45,2.94A4.12,4.12,0,0,0,28.12,38a4.23,4.23,0,0,0,2.45-.25c1.34-.39,3-.87,4.46.43a3.1,3.1,0,0,1,1.08,3.33.69.69,0,0,1,0,.13c1,.83.81,2.27.61,3.54-.14.93-.31,2.09.08,2.52a6.48,6.48,0,0,1,1.31,3.62l0,.17c0,.18,0,.35.08.52l-2.33.4-.09-.58,0-.17a4.81,4.81,0,0,0-.7-2.35c-1.17-1.26-.9-3-.68-4.49a7.22,7.22,0,0,0,.13-1.42A2.18,2.18,0,0,1,33.8,41c.1-.49.13-.64-.36-1.08s-1-.27-2.22.09a6,6,0,0,1-4.1.12L27,40.1a6.47,6.47,0,0,1-3-3.93,6.14,6.14,0,0,1,.7-4.74,9.78,9.78,0,0,1,7.74-5,3.25,3.25,0,0,1,2.89.66,2.15,2.15,0,0,1,.52.87,7.78,7.78,0,0,0,1.34.64c.74-1.12,2.08-.76,2.84-.57a8.32,8.32,0,0,0,2.06.36c2.43.08,2.79,1.68,3.08,3A9.33,9.33,0,0,0,46,33.9c.88,1.68,1.6,1.57,2.68,1.4a7.52,7.52,0,0,1,.83-.09,1.45,1.45,0,0,1,1.5,1c.08.28.33,1.14-1.18,3.22a9.72,9.72,0,0,1-2.68,2.61c-.58.35-.63.79-.26,2.38.06.27.12.55.17.82a2.62,2.62,0,0,1-1.33,2.62c-.52.41-.73.6-.77,1C44.88,51.86,42.18,54.29,39.68,55.06Z" />
          <path d="M48.58,47.23s-1,3.29.27,3.4,2.35-5.05,1.67-5.27S50.22,47.08,48.58,47.23Z" />
          <path d="M46.67,68.19H30.41a4.13,4.13,0,1,1,0-8.25H46.67a4.13,4.13,0,0,1,0,8.25ZM30.41,62.31a1.76,1.76,0,1,0,0,3.51H46.67a1.76,1.76,0,0,0,0-3.51Z" />
          <circle cx={63.8} cy={26.25} r={2.48} />
          <circle cx={60.63} cy={53.35} r={2.06} />
          <circle cx={11.99} cy={29.25} r={4.13} />
          <circle cx={21.16} cy={58.58} r={2.97} />
          <rect x={31.4} y={70.01} width={8.09} height={2.37} />
          <path d="M608.82,53.1a2.65,2.65,0,1,1-2.65-2.65A2.65,2.65,0,0,1,608.82,53.1Zm-.55,0a2.11,2.11,0,1,0-2.1,2.11A2.1,2.1,0,0,0,608.27,53.1Zm-1.54.34.71.94h-.82L606,53.5h-.16v.88h-.68V51.83h1.31a.78.78,0,0,1,.86.84A.77.77,0,0,1,606.73,53.44Zm-.45-1h-.46V53h.46c.24,0,.32-.11.32-.3S606.52,52.41,606.28,52.41Z" />
          <path d="M87.31,44.43h7.38c1.09,3.91,4,5.71,10.08,5.71,4.68,0,7.57-1.41,7.57-4,0-3-3.34-3.4-9.24-4.82C93.21,38.84,89,36.85,89,31c0-7.13,6-11.23,14.89-11.23,9,0,14.12,4.3,15.41,10.72H112c-1-2.89-3.72-4.3-8.22-4.3-4.68,0-7.44,1.6-7.44,4,0,2.25,2.18,2.82,8.34,4.3,9.57,2.25,15.09,3.91,15.09,10.78,0,7.58-6.81,11.3-15.15,11.3C95.33,56.56,88.66,52.07,87.31,44.43Z" />
          <path d="M159.26,33.52V55.79H152V35c0-5.45-2.44-8.34-7.77-8.34-6.16,0-9.5,4-9.5,10.85V55.79h-7.25V6.37h7.25V26.26a13,13,0,0,1,11.81-6.54C154.45,19.72,159.26,24.92,159.26,33.52Z" />
          <path d="M201.71,20.49v35.3h-7.25V49.88a14.1,14.1,0,0,1-12.33,6.68c-9.43,0-16.3-7.64-16.3-18.42s7-18.42,16.24-18.42a14.25,14.25,0,0,1,12.39,6.8v-6Zm-7.19,17.65c0-6.74-4.68-11.49-10.84-11.49s-10.53,4.75-10.53,11.49,4.43,11.49,10.53,11.49S194.52,44.94,194.52,38.14Z" />
          <path d="M262.84,33.13V55.79h-7.25V34.67c0-5.26-2.12-8-7-8-5.71,0-8.66,4.43-8.66,10.85L240,55.79h-7.32V34.67c0-5.26-2.11-8-7-8-5.71,0-8.6,4.43-8.6,10.85V55.79h-7.26V20.49h7.26v5.65c2.44-4.05,5.9-6.42,11-6.42,5.39,0,9.18,2.63,10.91,7.38a12.85,12.85,0,0,1,11.94-7.38C258.35,19.72,262.84,24.72,262.84,33.13Z" />
          <path d="M280,9a4.73,4.73,0,1,1-4.75-4.43A4.44,4.44,0,0,1,280,9Zm-8.35,11.49h7.26v35.3h-7.26Z" />
          <path d="M309.05,19.91v7.38a19.92,19.92,0,0,0-2.18-.13c-6.61,0-11.68,3.73-11.68,12.45V55.79h-7.25V20.49h7.25v7a12.08,12.08,0,0,1,11.74-7.76A9.06,9.06,0,0,1,309.05,19.91Z" />
          <path d="M323.81,9a4.72,4.72,0,1,1-4.75-4.43A4.44,4.44,0,0,1,323.81,9Zm-8.34,11.49h7.25v35.3h-7.25Z" />
          <path d="M341,7.84a3.78,3.78,0,1,1-3.77-3.58A3.62,3.62,0,0,1,341,7.84ZM334.47,20h5.4V55.75h-5.4Z" />
          <path d="M378.74,33.06V55.75h-5.4V34.1c0-6.43-3.18-9.68-9-9.68-7.28,0-11.31,5.13-11.31,13V55.75h-5.4V20H353v7.08c2.4-4.81,6.56-7.8,12.8-7.8C373.86,19.28,378.74,24.35,378.74,33.06Z" />
          <path d="M384,44.57h5.52c1.43,5,5.14,6.76,11.77,6.76,5.33,0,9.23-1.89,9.23-5.33s-4-4.23-10.53-5.85c-9.88-2.47-14.17-4.23-14.17-10.08,0-6.89,6-10.79,14.49-10.79s13.79,3.84,15.22,10.27h-5.46c-1.37-3.64-4.81-5.13-9.63-5.13-5.78,0-9.16,2.21-9.16,5.26,0,2.86,2.86,3.64,10.07,5.46,9.17,2.28,14.7,3.71,14.7,10.4,0,7.35-6.7,10.92-14.76,10.92C391.93,56.46,385.43,52.11,384,44.57Z" />
          <path d="M448,54.19a22.54,22.54,0,0,1-9.69,2.27c-7.67,0-12.8-4.94-12.8-14.36v-17h-6.89V20h6.89V11.41l5.39-1.17V20h16.06v5.07H430.86V41.84c0,6.11,2.74,9.62,8.32,9.62A23.08,23.08,0,0,0,447,49.7Z" />
          <path d="M459.92,7.84a3.78,3.78,0,1,1-3.77-3.58A3.63,3.63,0,0,1,459.92,7.84ZM453.42,20h5.39V55.75h-5.39Z" />
          <path d="M492.81,54.19a22.58,22.58,0,0,1-9.69,2.27c-7.67,0-12.8-4.94-12.8-14.36v-17h-6.89V20h6.89V11.41l5.39-1.17V20h16.06v5.07H475.71V41.84c0,6.11,2.73,9.62,8.32,9.62a23.08,23.08,0,0,0,7.8-1.76Z" />
          <path d="M528.75,20V55.75h-5.39V48.66a13.59,13.59,0,0,1-12.74,7.8c-7.93,0-12.68-5.07-12.68-13.78V20h5.4V41.64c0,6.37,3,9.69,8.84,9.69,7.08,0,11.18-5.07,11.18-13V20Z" />
          <path d="M562.62,54.19a22.58,22.58,0,0,1-9.69,2.27c-7.67,0-12.8-4.94-12.8-14.36v-17h-6.89V20h6.89V11.41l5.39-1.17V20h16.06v5.07H545.52V41.84c0,6.11,2.73,9.62,8.32,9.62a23.08,23.08,0,0,0,7.8-1.76Z" />
          <path d="M601.23,39.5H570.61c.52,7.41,5.79,11.89,13,11.89,4.94,0,9-2.08,11.18-6.24h5.6c-3,7.61-9.5,11.31-17,11.31-10.6,0-18.33-7.54-18.33-18.46s7.6-18.72,18.26-18.72C594.47,19.28,601.68,27.73,601.23,39.5Zm-30.36-5.07h24.51c-1.17-6-5.59-10.08-12-10.08A12.34,12.34,0,0,0,570.87,34.43Z" />
        </g>
      </g>
    </svg>
  ),
  school: ({ className, ...props }: LucideProps) => (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="20" cy="20" r="19.75" stroke="currentColor" strokeWidth="0.5" />
      <path
        stroke="currentColor"
        d="M20 15.9586L25.3333 18.6069V29.2H14.6667V18.6069L20 15.9586ZM20 15.9586V10M10 29.2H30M12 29.2V21.2552H14.6667M28 29.2V21.2552H25.3333M18.6667 29.2V25.2276H21.3333V29.2M20 10.6621H24V13.3103H20M20 22.5793C19.6464 22.5793 19.3072 22.4398 19.0572 22.1915C18.8071 21.9432 18.6667 21.6064 18.6667 21.2552C18.6667 20.904 18.8071 20.5672 19.0572 20.3189C19.3072 20.0705 19.6464 19.931 20 19.931C20.3536 19.931 20.6928 20.0705 20.9428 20.3189C21.1929 20.5672 21.3333 20.904 21.3333 21.2552C21.3333 21.6064 21.1929 21.9432 20.9428 22.1915C20.6928 22.4398 20.3536 22.5793 20 22.5793Z"
      />
    </svg>
  ),
  users: ({ className, ...props }: LucideProps) => (
    <svg
      width="15"
      height="14"
      viewBox="0 0 15 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.83317 12.25V11.0833C9.83317 10.4645 9.58734 9.871 9.14975 9.43342C8.71217 8.99583 8.11868 8.75 7.49984 8.75H3.99984C3.381 8.75 2.78751 8.99583 2.34992 9.43342C1.91234 9.871 1.6665 10.4645 1.6665 11.0833V12.25"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.74984 6.41667C7.0385 6.41667 8.08317 5.372 8.08317 4.08333C8.08317 2.79467 7.0385 1.75 5.74984 1.75C4.46117 1.75 3.4165 2.79467 3.4165 4.08333C3.4165 5.372 4.46117 6.41667 5.74984 6.41667Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.3335 12.25V11.0833C13.3331 10.5663 13.161 10.0641 12.8443 9.65549C12.5275 9.24689 12.0841 8.95505 11.5835 8.82581"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.8335 1.82581C10.3354 1.95431 10.7803 2.24621 11.098 2.65549C11.4156 3.06476 11.5881 3.56812 11.5881 4.08622C11.5881 4.60432 11.4156 5.10769 11.098 5.51696C10.7803 5.92623 10.3354 6.21813 9.8335 6.34664"
      />
    </svg>
  ),
  usersWithOutline: ({ className, ...props }: LucideProps) => (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="20" cy="20" r="19.75" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M23.6667 27V25.3333C23.6667 24.4493 23.3155 23.6014 22.6904 22.9763C22.0652 22.3512 21.2174 22 20.3333 22H15.3333C14.4493 22 13.6014 22.3512 12.9763 22.9763C12.3512 23.6014 12 24.4493 12 25.3333V27"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.8333 18.6667C19.6743 18.6667 21.1667 17.1743 21.1667 15.3333C21.1667 13.4924 19.6743 12 17.8333 12C15.9924 12 14.5 13.4924 14.5 15.3333C14.5 17.1743 15.9924 18.6667 17.8333 18.6667Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M28.667 27.0001V25.3334C28.6664 24.5948 28.4206 23.8774 27.9681 23.2937C27.5156 22.7099 26.8821 22.293 26.167 22.1084"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M23.667 12.1084C24.384 12.292 25.0195 12.709 25.4734 13.2937C25.9272 13.8783 26.1735 14.5974 26.1735 15.3376C26.1735 16.0777 25.9272 16.7968 25.4734 17.3815C25.0195 17.9661 24.384 18.3831 23.667 18.5667"
      />
    </svg>
  ),
  smileyface: Smile,
  schoolMinusOutline: ({ className, ...props }: LucideProps) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M10 5.95862L15.3333 8.6069V19.2H4.66667V8.6069L10 5.95862ZM10 5.95862V0M0 19.2H20M2 19.2V11.2552H4.66667M18 19.2V11.2552H15.3333M8.66667 19.2V15.2276H11.3333V19.2M10 0.662069H14V3.31034H10M10 12.5793C9.64638 12.5793 9.30724 12.4398 9.05719 12.1915C8.80714 11.9432 8.66667 11.6064 8.66667 11.2552C8.66667 10.904 8.80714 10.5672 9.05719 10.3189C9.30724 10.0705 9.64638 9.93103 10 9.93103C10.3536 9.93103 10.6928 10.0705 10.9428 10.3189C11.1929 10.5672 11.3333 10.904 11.3333 11.2552C11.3333 11.6064 11.1929 11.9432 10.9428 12.1915C10.6928 12.4398 10.3536 12.5793 10 12.5793Z"
      />
    </svg>
  ),
  clinicalCase: ({ className, ...props }: LucideProps) => (
    <svg
      width="20"
      height="22"
      viewBox="0 0 20 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.0167 4.03019C16.5987 3.58719 16.1019 3.2357 15.5549 2.99586C15.0079 2.75603 14.4215 2.63257 13.8292 2.63257C13.237 2.63257 12.6505 2.75603 12.1036 2.99586C11.5566 3.2357 11.0598 3.58719 10.6417 4.03019L10.0001 4.71657L9.35841 4.03019C8.94034 3.58719 8.44357 3.2357 7.89659 2.99586C7.34961 2.75603 6.76317 2.63257 6.17091 2.63257C5.57864 2.63257 4.9922 2.75603 4.44522 2.99586C3.89824 3.2357 3.40147 3.58719 2.98341 4.03019C1.21674 5.89573 1.10841 9.04603 3.33341 11.4396L10.0001 18.4793L16.6667 11.4396C18.8917 9.04603 18.7834 5.89573 17.0167 4.03019Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.0001 4.71655L7.39174 7.47966C7.06199 7.83072 6.87695 8.30516 6.87695 8.79962C6.87695 9.29409 7.06199 9.76852 7.39174 10.1196C7.7242 10.4678 8.17349 10.6632 8.64174 10.6632C9.11 10.6632 9.55929 10.4678 9.89174 10.1196L11.7751 8.17484C12.2431 7.68583 12.875 7.41154 13.5334 7.41154C14.1918 7.41154 14.8237 7.68583 15.2917 8.17484L17.2917 10.2868"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.9997 13.1996L13.333 11.4397"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.4997 15.8395L10.833 14.0796"
      />
    </svg>
  ),
  edit: ({ className, strokeWidth, ...props }: LucideProps) => (
    <svg
      width="23"
      height="24"
      viewBox="0 0 23 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M2.76611 21H19.3619"
        stroke="currentColor"
        strokeWidth={strokeWidth || "1.75"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        stroke="currentColor"
        strokeWidth={strokeWidth || "1.75"}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.14904 13.5L13.3689 3.49998C14.1327 2.67155 15.3711 2.67155 16.1349 3.49998C16.8986 4.32841 16.8986 5.67155 16.1349 6.49998L6.91499 16.5L3.22705 17.5L4.14904 13.5Z"
      />
    </svg>
  ),
  delete: ({ className, strokeWidth, ...props }: LucideProps) => (
    <svg
      width="23"
      height="24"
      viewBox="0 0 23 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        stroke="currentColor"
        strokeWidth={strokeWidth || "1.75"}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.26611 6H19.8619M5.11009 6V20C5.11009 21.1046 5.93566 22 6.95406 22H16.1739C17.1923 22 18.0179 21.1046 18.0179 20V6M7.87604 6V4C7.87604 2.89543 8.70162 2 9.72001 2H13.408C14.4264 2 15.2519 2.89543 15.2519 4V6"
      />
      <path
        d="M13.4077 11V17"
        stroke="currentColor"
        strokeWidth={strokeWidth || "1.75"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.71973 11V17"
        stroke="currentColor"
        strokeWidth={strokeWidth || "1.75"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  add: ({ className, ...props }: LucideProps) => (
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
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7V17M7 12H17"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      />
    </svg>
  ),
  home: ({ className, ...props }: LucideProps) => (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fill="currentColor"
        d="M21.8521 9.59985C21.8521 9.28158 21.7256 8.97636 21.5006 8.75131C21.2755 8.52626 20.9703 8.39983 20.6521 8.39983C20.3338 8.39983 20.0286 8.52626 19.8035 8.75131C19.5785 8.97636 19.4521 9.28158 19.4521 9.59985H21.8521ZM5.05205 9.59985C5.05205 9.28158 4.92562 8.97636 4.70058 8.75131C4.47553 8.52626 4.17031 8.39983 3.85205 8.39983C3.53379 8.39983 3.22857 8.52626 3.00352 8.75131C2.77848 8.97636 2.65205 9.28158 2.65205 9.59985H5.05205ZM22.2037 12.8483C22.43 13.0669 22.7331 13.1878 23.0477 13.1851C23.3624 13.1824 23.6633 13.0562 23.8858 12.8337C24.1083 12.6112 24.2345 12.3102 24.2373 11.9956C24.24 11.6809 24.119 11.3778 23.9005 11.1515L22.2037 12.8483ZM12.2521 1.19976L13.1005 0.351347C12.8754 0.12638 12.5702 0 12.2521 0C11.9339 0 11.6287 0.12638 11.4037 0.351347L12.2521 1.19976ZM0.603651 11.1515C0.489038 11.2622 0.39762 11.3946 0.334729 11.541C0.271838 11.6874 0.238735 11.8449 0.23735 12.0042C0.235965 12.1635 0.266327 12.3215 0.326665 12.469C0.387002 12.6165 0.476105 12.7505 0.588777 12.8632C0.701448 12.9758 0.83543 13.0649 0.982906 13.1253C1.13038 13.1856 1.2884 13.216 1.44773 13.2146C1.60707 13.2132 1.76453 13.1801 1.91094 13.1172C2.05734 13.0543 2.18975 12.9629 2.30045 12.8483L0.603651 11.1515ZM6.25205 24H18.2521V21.6H6.25205V24ZM21.8521 20.4V9.59985H19.4521V20.4H21.8521ZM5.05205 20.4V9.59985H2.65205V20.4H5.05205ZM23.9005 11.1515L13.1005 0.351347L11.4037 2.04817L22.2037 12.8483L23.9005 11.1515ZM11.4037 0.351347L0.603651 11.1515L2.30045 12.8483L13.1005 2.04817L11.4037 0.351347ZM18.2521 24C19.2068 24 20.1225 23.6207 20.7976 22.9456C21.4728 22.2704 21.8521 21.3548 21.8521 20.4H19.4521C19.4521 20.7182 19.3256 21.0235 19.1006 21.2485C18.8755 21.4735 18.5703 21.6 18.2521 21.6V24ZM6.25205 21.6C5.93379 21.6 5.62857 21.4735 5.40352 21.2485C5.17848 21.0235 5.05205 20.7182 5.05205 20.4H2.65205C2.65205 21.3548 3.03134 22.2704 3.70647 22.9456C4.3816 23.6207 5.29727 24 6.25205 24V21.6Z"
      />
    </svg>
  ),
  user: ({ className, ...props }: LucideProps) => (
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
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M1.42969 20.0001C1.42969 18.5856 1.99159 17.229 2.99178 16.2288C3.99198 15.2287 5.34853 14.6667 6.76302 14.6667H17.4297C18.8442 14.6667 20.2007 15.2287 21.2009 16.2288C22.2011 17.229 22.763 18.5856 22.763 20.0001C22.763 20.7073 22.4821 21.3856 21.982 21.8857C21.4819 22.3858 20.8036 22.6667 20.0964 22.6667H4.09635C3.38911 22.6667 2.71083 22.3858 2.21074 21.8857C1.71064 21.3856 1.42969 20.7073 1.42969 20.0001Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="2"
        d="M12.0962 9.33337C14.3053 9.33337 16.0962 7.54251 16.0962 5.33337C16.0962 3.12424 14.3053 1.33337 12.0962 1.33337C9.88705 1.33337 8.09619 3.12424 8.09619 5.33337C8.09619 7.54251 9.88705 9.33337 12.0962 9.33337Z"
      />
    </svg>
  ),
  notificationBell: ({ className, ...props }: LucideProps) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.66667 7.88173V7.00008C4.66667 4.05456 7.05448 1.66675 10 1.66675C12.9455 1.66675 15.3333 4.05456 15.3333 7.00008V7.88173C15.3333 9.79866 15.8874 11.6747 16.9288 13.2842L17.5 14.1667H2.5L3.07116 13.2841C4.1126 11.6747 4.66667 9.79866 4.66667 7.88173Z"
      />
      <path
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.1665 17.4075C9.61184 17.9023 10.3878 17.9023 10.8332 17.4075"
      />
    </svg>
  ),
  referral: ({ className, ...props }: LucideProps) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.6076 7.67886V4.10742L17.5002 9.99996L11.6076 15.8925V11.866M11.6076 7.68582C11.0716 7.56419 10.5137 7.49997 9.9409 7.49997C5.79878 7.49997 2.44092 10.8579 2.44092 15C2.44092 15.7229 2.54319 16.4219 2.73406 17.0833C3.63685 13.9547 6.52168 11.6666 9.9409 11.6666C10.5137 11.6666 11.0716 11.7309 11.6076 11.8525"
      />
    </svg>
  ),
  flagcase: ({ className, ...props }: LucideProps) => (
    <svg
      width="20"
      height="17"
      viewBox="0 0 20 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fill="currentColor"
        d="M2.08888 13.8603C2.55862 9.56198 2.70835 6.19597 2.00193 2.14752C1.98805 2.06713 2.05084 1.99359 2.12993 2.00044C7.7686 2.45727 13.7345 4.64789 19.9365 8.09492C20.0446 8.15475 20.0065 8.32427 19.884 8.32925C13.2273 8.59101 7.1135 9.91722 2.28571 13.9713C2.20118 14.0423 2.0768 13.9725 2.08888 13.861V13.8603Z"
      />
      <path
        fill="#575756"
        d="M0.4933 17.0001C0.220973 17.0001 0 16.8968 0 16.7696C0.897121 11.9024 0.992824 6.88006 0 1.6472C0 1.51998 0.220973 1.41675 0.4933 1.41675C0.765626 1.41675 0.986599 1.51998 0.986599 1.6472C1.58883 6.94585 1.53047 11.9617 0.986599 16.7696C0.986599 16.8968 0.765626 17.0001 0.4933 17.0001Z"
      />
      <path
        fill="#575756"
        d="M1.02276 2.06441C1.58762 2.06441 2.04553 1.60228 2.04553 1.0322C2.04553 0.462134 1.58762 0 1.02276 0C0.457906 0 0 0.462134 0 1.0322C0 1.60228 0.457906 2.06441 1.02276 2.06441Z"
      />
    </svg>
  ),
  riskIcon: ({ className, ...props }: LucideProps) => (
    <svg
      width="15"
      height="16"
      viewBox="0 0 15 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1.37602 12.0434L6.35269 3.00316C6.81381 2.16561 8.18619 2.16561 8.64731 3.00316L13.624 12.0434C14.0277 12.7767 13.4124 13.625 12.4767 13.625H2.52331C1.58764 13.625 0.972319 12.7767 1.37602 12.0434Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 6.125V8.625"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 11.1372V11.125"
      />
    </svg>
  ),
  issueIcon: ({ className, ...props }: LucideProps) => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g clipPath="url(#clip0_2223_864)">
        <path d="M7.5 5V7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M7.5 10.0122V10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 13.75C10.9518 13.75 13.75 10.9518 13.75 7.5C13.75 4.04822 10.9518 1.25 7.5 1.25C4.04822 1.25 1.25 4.04822 1.25 7.5C1.25 10.9518 4.04822 13.75 7.5 13.75Z"
        />
      </g>
      <defs>
        <clipPath id="clip0_2223_864">
          <rect width="15" height="15" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
  upload: ({ className, ...props }: LucideProps) => (
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 9.33325V13.3333C2.5 14.0697 3.09695 14.6666 3.83333 14.6666H13.1667C13.9031 14.6666 14.5 14.0697 14.5 13.3333V9.33325"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.50033 11.3333V2M8.50033 2L5.16699 5.62964M8.50033 2L11.8337 5.62963"
      />
    </svg>
  ),
  heartHandshake: ({ className, ...props }: LucideProps) => (
    <svg
      width="20"
      height="22"
      viewBox="0 0 20 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M17.0167 4.53019C16.5986 4.08719 16.1018 3.7357 15.5549 3.49586C15.0079 3.25603 14.4214 3.13257 13.8292 3.13257C13.2369 3.13257 12.6505 3.25603 12.1035 3.49586C11.5565 3.7357 11.0597 4.08719 10.6417 4.53019L10 5.21657L9.35835 4.53019C8.94028 4.08719 8.44351 3.7357 7.89653 3.49586C7.34955 3.25603 6.76311 3.13257 6.17084 3.13257C5.57858 3.13257 4.99214 3.25603 4.44516 3.49586C3.89818 3.7357 3.40141 4.08719 2.98334 4.53019C1.21668 6.39573 1.10834 9.54603 3.33334 11.9396L10 18.9793L16.6667 11.9396C18.8917 9.54603 18.7833 6.39573 17.0167 4.53019Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 5.21655L7.39168 7.97966C7.06192 8.33072 6.87689 8.80516 6.87689 9.29962C6.87689 9.79409 7.06192 10.2685 7.39168 10.6196C7.72414 10.9678 8.17343 11.1632 8.64168 11.1632C9.10994 11.1632 9.55923 10.9678 9.89168 10.6196L11.775 8.67484C12.2431 8.18583 12.8749 7.91154 13.5333 7.91154C14.1918 7.91154 14.8236 8.18583 15.2917 8.67484L17.2917 10.7868"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 13.6996L13.3333 11.9397"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 16.3395L10.8333 14.5796"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  calendarDateAppointmentTime: ({ className, ...props }: LucideProps) => (
    <svg
      width="21"
      height="22"
      viewBox="0 0 21 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M6 3H3C1.89543 3 1 3.89543 1 5V8M6 3H14M6 3V1M6 3V5M14 3H17C18.1046 3 19 3.89543 19 5V8H1M14 3V1M14 3V5M1 8V19C1 20.1046 1.89543 21 3 21H8M15 14.25V16L16.25 17.25M20 16C20 18.7614 17.7614 21 15 21C12.2386 21 10 18.7614 10 16C10 13.2386 12.2386 11 15 11C17.7614 11 20 13.2386 20 16Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  star: ({ className, ...props }: LucideProps) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={className}
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.99935 0.666992L10.9666 6.72152H17.3327L12.1824 10.4634L14.1496 16.5179L8.99935 12.7761L3.84907 16.5179L5.8163 10.4634L0.666016 6.72152H7.03212L8.99935 0.666992Z"
      />
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
  vshapedHumberger: ({ className, ...props }: LucideProps) => (
    <svg
      {...props}
      className={className}
      width="20"
      height="10"
      viewBox="0 0 20 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1.66699 0.833252H18.3337M5.00033 4.99992H15.0003M9.16699 9.16659H10.8337"
      />
    </svg>
  ),
  waveIcon: ({ className, ...props }: LucideProps) => (
    <svg
      {...props}
      className={className}
      fill="none"
      width="800px"
      height="800px"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="Wave_Pulse_1" data-name="Wave Pulse 1">
        <path
          fill="currentColor"
          stroke="currentColor"
          d="M8.974,18h0a1.446,1.446,0,0,1-1.259-.972L5.872,12.883c-.115-.26-.262-.378-.349-.378H2.562a.5.5,0,1,1,0-1H5.523a1.444,1.444,0,0,1,1.263.972l1.839,4.145c.116.261.258.378.349.378h0c.088,0,.229-.113.344-.368L13.7,6.956A1.423,1.423,0,0,1,14.958,6h0a1.449,1.449,0,0,1,1.26.975l1.839,4.151c.11.249.259.379.349.379h3.028a.5.5,0,0,1,0,1H18.41a1.444,1.444,0,0,1-1.263-.975L15.308,7.379c-.116-.261-.259-.378-.35-.379h0c-.088,0-.229.114-.344.368l-4.385,9.676A1.437,1.437,0,0,1,8.974,18Z"
        />
      </g>
    </svg>
  ),
  hubspot: ({ className, ...props }: LucideProps) => (
    <svg
      width={28}
      height={27}
      viewBox="0 0 28 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M9.8 21.2333C10.2433 21.8167 10.5 22.54 10.5 23.3333C10.5 25.27 8.93667 26.8333 7 26.8333C5.06333 26.8333 3.5 25.27 3.5 23.3333C3.5 21.3967 5.06333 19.8333 7 19.8333C7.51333 19.8333 7.99167 19.9383 8.435 20.1367L10.08 18.0717C9.56325 17.4925 9.18121 16.8061 8.96133 16.0618C8.74146 15.3174 8.68921 14.5336 8.80833 13.7667L6.44 12.9733C6.03195 13.6098 5.42861 14.0968 4.72041 14.3615C4.01221 14.6261 3.23731 14.6541 2.51188 14.4412C1.78645 14.2283 1.14956 13.786 0.696695 13.1806C0.24383 12.5752 -0.000616332 11.8394 1.16703e-06 11.0833C1.16703e-06 9.14667 1.56333 7.58333 3.5 7.58333C5.43667 7.58333 7 9.14667 7 11.0833C7 11.165 7 11.2467 6.98833 11.3283L9.35667 12.1217C9.732 11.4116 10.2663 10.7978 10.918 10.3283C11.5696 9.85882 12.321 9.54625 13.1133 9.415V6.895C12.365 6.69533 11.7033 6.25448 11.2309 5.64072C10.7584 5.02696 10.5015 4.27454 10.5 3.5C10.5 1.56333 12.0633 0 14 0C15.9367 0 17.5 1.56333 17.5 3.5C17.5 5.13333 16.38 6.49833 14.875 6.895V9.415C16.5083 9.68333 17.885 10.71 18.6317 12.1217L21 11.3283V11.0833C21 9.14667 22.5633 7.58333 24.5 7.58333C26.4367 7.58333 28 9.14667 28 11.0833C28 13.02 26.4367 14.5833 24.5 14.5833C23.2633 14.5833 22.19 13.9417 21.56 12.985L19.1917 13.7783C19.312 14.5453 19.2603 15.3294 19.0403 16.074C18.8204 16.8185 18.4377 17.5048 17.92 18.0833L19.565 20.1483C20.0083 19.9383 20.4867 19.8333 21 19.8333C22.9367 19.8333 24.5 21.3967 24.5 23.3333C24.5 25.27 22.9367 26.8333 21 26.8333C19.0633 26.8333 17.5 25.27 17.5 23.3333C17.5 22.54 17.7567 21.8167 18.2 21.2333L16.555 19.1683C14.98 20.0433 13.0433 20.055 11.4567 19.1683L9.8 21.2333Z"
        fill="currentColor"
      />
    </svg>
  ),
  wallet: ({ className, ...props }: LucideProps) => (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M23.3333 11.3337V7.33365C23.3333 5.8609 22.2887 4.66699 21 4.66699H4.66665C3.37798 4.66699 2.33331 5.8609 2.33331 7.33365V20.667C2.33331 22.1398 3.37798 23.3337 4.66665 23.3337H21C22.2887 23.3337 23.3333 22.1398 23.3333 20.667V16.667M25.6666 11.3337H18.6666C17.3779 11.3337 16.3333 12.5275 16.3333 14.0003C16.3333 15.4731 17.3779 16.667 18.6666 16.667H25.6666V11.3337Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
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

export const CalendarIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.6667 2.50016H15.8333V1.66683C15.8333 1.2085 15.4583 0.833496 15 0.833496C14.5417 0.833496 14.1667 1.2085 14.1667 1.66683V2.50016H5.83332V1.66683C5.83332 1.2085 5.45832 0.833496 4.99999 0.833496C4.54166 0.833496 4.16666 1.2085 4.16666 1.66683V2.50016H3.33332C2.41666 2.50016 1.66666 3.25016 1.66666 4.16683V17.5002C1.66666 18.4168 2.41666 19.1668 3.33332 19.1668H16.6667C17.5833 19.1668 18.3333 18.4168 18.3333 17.5002V4.16683C18.3333 3.25016 17.5833 2.50016 16.6667 2.50016ZM15.8333 17.5002H4.16666C3.70832 17.5002 3.33332 17.1252 3.33332 16.6668V6.66683H16.6667V16.6668C16.6667 17.1252 16.2917 17.5002 15.8333 17.5002Z"
    />
  </svg>
);

export const SchoolIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill={fill || "currentColor"}
  >
    <path d="M14.1667 9.16667V4.16667C14.1667 3.25 13.4167 2.5 12.5 2.5H7.5C6.58333 2.5 5.83333 3.25 5.83333 4.16667V5.83333H4.16667C3.25 5.83333 2.5 6.58333 2.5 7.5V15.8333C2.5 16.75 3.25 17.5 4.16667 17.5H8.33333C8.79167 17.5 9.16667 17.125 9.16667 16.6667V14.1667H10.8333V16.6667C10.8333 17.125 11.2083 17.5 11.6667 17.5H15.8333C16.75 17.5 17.5 16.75 17.5 15.8333V10.8333C17.5 9.91667 16.75 9.16667 15.8333 9.16667H14.1667ZM5.83333 15.8333H4.16667V14.1667H5.83333V15.8333ZM5.83333 12.5H4.16667V10.8333H5.83333V12.5ZM5.83333 9.16667H4.16667V7.5H5.83333V9.16667ZM9.16667 12.5H7.5V10.8333H9.16667V12.5ZM9.16667 9.16667H7.5V7.5H9.16667V9.16667ZM9.16667 5.83333H7.5V4.16667H9.16667V5.83333ZM12.5 12.5H10.8333V10.8333H12.5V12.5ZM12.5 9.16667H10.8333V7.5H12.5V9.16667ZM12.5 5.83333H10.8333V4.16667H12.5V5.83333ZM15.8333 15.8333H14.1667V14.1667H15.8333V15.8333ZM15.8333 12.5H14.1667V10.8333H15.8333V12.5Z" />
  </svg>
);

export const PeopleIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.75 9.99984C14.9 9.99984 15.825 9.0665 15.825 7.9165C15.825 6.7665 14.9 5.83317 13.75 5.83317C12.6 5.83317 11.6667 6.7665 11.6667 7.9165C11.6667 9.0665 12.6 9.99984 13.75 9.99984ZM7.50001 9.1665C8.88334 9.1665 9.99167 8.04984 9.99167 6.6665C9.99167 5.28317 8.88334 4.1665 7.50001 4.1665C6.11667 4.1665 5.00001 5.28317 5.00001 6.6665C5.00001 8.04984 6.11667 9.1665 7.50001 9.1665ZM13.75 11.6665C12.225 11.6665 9.16667 12.4332 9.16667 13.9582V14.9998C9.16667 15.4582 9.54167 15.8332 10 15.8332H17.5C17.9583 15.8332 18.3333 15.4582 18.3333 14.9998V13.9582C18.3333 12.4332 15.275 11.6665 13.75 11.6665ZM7.50001 10.8332C5.55834 10.8332 1.66667 11.8082 1.66667 13.7498V14.9998C1.66667 15.4582 2.04167 15.8332 2.50001 15.8332H7.50001V13.9582C7.50001 13.2498 7.77501 12.0082 9.47501 11.0665C8.75001 10.9165 8.05001 10.8332 7.50001 10.8332Z"
    />
  </svg>
);

export const PeopleIconAlternate = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.0003 1.6665C5.40033 1.6665 1.66699 5.39984 1.66699 9.99984C1.66699 14.5998 5.40033 18.3332 10.0003 18.3332C14.6003 18.3332 18.3337 14.5998 18.3337 9.99984C18.3337 5.39984 14.6003 1.6665 10.0003 1.6665ZM13.0087 6.94984C13.9003 6.94984 14.617 7.6665 14.617 8.55817C14.617 9.44984 13.9003 10.1665 13.0087 10.1665C12.117 10.1665 11.4003 9.44984 11.4003 8.55817C11.392 7.6665 12.117 6.94984 13.0087 6.94984ZM8.00866 5.63317C9.09199 5.63317 9.97532 6.5165 9.97532 7.59984C9.97532 8.68317 9.09199 9.5665 8.00866 9.5665C6.92533 9.5665 6.04199 8.68317 6.04199 7.59984C6.04199 6.50817 6.91699 5.63317 8.00866 5.63317ZM8.00866 13.2415V16.3665C6.00866 15.7415 4.42533 14.1998 3.72533 12.2332C4.60033 11.2998 6.78366 10.8248 8.00866 10.8248C8.45033 10.8248 9.00866 10.8915 9.59199 11.0082C8.22533 11.7332 8.00866 12.6915 8.00866 13.2415ZM10.0003 16.6665C9.77533 16.6665 9.55866 16.6582 9.34199 16.6332V13.2415C9.34199 12.0582 11.792 11.4665 13.0087 11.4665C13.9003 11.4665 15.442 11.7915 16.2087 12.4248C15.2337 14.8998 12.8253 16.6665 10.0003 16.6665Z"
    />
  </svg>
);

export const GraduationCapIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.16706 10.9834V13.3251C4.16706 13.9334 4.50039 14.5001 5.03372 14.7917L9.20039 17.0667C9.70039 17.3417 10.3004 17.3417 10.8004 17.0667L14.9671 14.7917C15.5004 14.5001 15.8337 13.9334 15.8337 13.3251V10.9834L10.8004 13.7334C10.3004 14.0084 9.70039 14.0084 9.20039 13.7334L4.16706 10.9834ZM9.20039 2.9334L2.17539 6.76673C1.60039 7.0834 1.60039 7.91673 2.17539 8.2334L9.20039 12.0667C9.70039 12.3417 10.3004 12.3417 10.8004 12.0667L17.5004 8.4084V13.3334C17.5004 13.7917 17.8754 14.1667 18.3337 14.1667C18.7921 14.1667 19.1671 13.7917 19.1671 13.3334V7.99173C19.1671 7.6834 19.0004 7.4084 18.7337 7.2584L10.8004 2.9334C10.3004 2.66673 9.70039 2.66673 9.20039 2.9334Z"
    />
  </svg>
);

export const SignOutIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 20 20"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.0001 2.5C9.54173 2.5 9.16673 2.875 9.16673 3.33333V10C9.16673 10.4583 9.54173 10.8333 10.0001 10.8333C10.4584 10.8333 10.8334 10.4583 10.8334 10V3.33333C10.8334 2.875 10.4584 2.5 10.0001 2.5ZM14.2834 4.88333C13.9584 5.20833 13.9667 5.71667 14.2751 6.04167C15.2167 7.04167 15.8001 8.375 15.8334 9.85C15.9084 13.0417 13.2667 15.7917 10.0751 15.825C6.81673 15.875 4.16673 13.25 4.16673 10C4.16673 8.46667 4.7584 7.075 5.72506 6.03333C6.0334 5.70833 6.0334 5.2 5.71673 4.88333C5.3834 4.55 4.84173 4.55833 4.52506 4.9C3.31673 6.18333 2.5584 7.89167 2.50006 9.78333C2.3834 13.85 5.69173 17.3667 9.7584 17.4917C14.0084 17.625 17.5001 14.2167 17.5001 9.99167C17.5001 8.01667 16.7334 6.23333 15.4834 4.9C15.1667 4.55833 14.6167 4.55 14.2834 4.88333Z"
    />
  </svg>
);

export const BarChartIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.33366 7.6665H5.50033C6.14199 7.6665 6.66699 8.1915 6.66699 8.83317V14.6665C6.66699 15.3082 6.14199 15.8332 5.50033 15.8332H5.33366C4.69199 15.8332 4.16699 15.3082 4.16699 14.6665V8.83317C4.16699 8.1915 4.69199 7.6665 5.33366 7.6665ZM10.0003 4.1665C10.642 4.1665 11.167 4.6915 11.167 5.33317V14.6665C11.167 15.3082 10.642 15.8332 10.0003 15.8332C9.35866 15.8332 8.83366 15.3082 8.83366 14.6665V5.33317C8.83366 4.6915 9.35866 4.1665 10.0003 4.1665ZM14.667 10.8332C15.3087 10.8332 15.8337 11.3582 15.8337 11.9998V14.6665C15.8337 15.3082 15.3087 15.8332 14.667 15.8332C14.0253 15.8332 13.5003 15.3082 13.5003 14.6665V11.9998C13.5003 11.3582 14.0253 10.8332 14.667 10.8332V10.8332Z"
    />
  </svg>
);

export const FeedbackIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="23"
    height="23"
    viewBox="0 0 21 21"
    fill={fill || "currentColor"}
  >
    <path d="M16.5042 4.17403C16.5063 4.17611 16.5084 4.1782 16.5084 4.18236C16.775 4.54903 16.7084 5.0657 16.35 5.33236C16.2194 5.43093 16.0866 5.53169 15.9529 5.63313C15.6345 5.87471 15.3111 6.12014 15 6.34903C14.6334 6.62403 14.125 6.54903 13.85 6.18236C13.85 6.17819 13.8479 6.17611 13.8459 6.17403C13.8438 6.17195 13.8417 6.16986 13.8417 6.1657C13.5667 5.80736 13.6334 5.29069 14 5.0157C14.276 4.80339 14.5689 4.58432 14.8594 4.3671C15.0249 4.24328 15.1897 4.12005 15.35 3.99903C15.7084 3.72403 16.225 3.79903 16.5 4.16569C16.5 4.16986 16.5021 4.17195 16.5042 4.17403Z" />
    <path d="M15 10.174C15 10.6323 15.375 11.0073 15.8334 11.0073H17.5C17.9584 11.0073 18.3334 10.6323 18.3334 10.174C18.3334 9.71566 17.9584 9.34066 17.5 9.34066H15.8334C15.375 9.34066 15 9.71566 15 10.174Z" />
    <path d="M13.825 14.1906C13.55 14.5572 13.625 15.0656 13.9917 15.3322C14.4334 15.6572 14.9 16.0072 15.3417 16.3406C15.7084 16.6156 16.225 16.5406 16.4917 16.1739C16.4917 16.1697 16.4938 16.1677 16.4959 16.1656C16.4979 16.1635 16.5 16.1614 16.5 16.1572C16.775 15.7906 16.7 15.2739 16.3334 15.0072C15.8932 14.675 15.4281 14.3262 14.996 14.0021L14.9917 13.9989C14.625 13.7239 14.1084 13.8072 13.8334 14.1739C13.8334 14.1822 13.825 14.1906 13.825 14.1906Z" />
    <path d="M6.66669 7.67399H3.33335C2.41669 7.67399 1.66669 8.42399 1.66669 9.34066V11.0073C1.66669 11.924 2.41669 12.674 3.33335 12.674H4.16669V15.174C4.16669 15.6323 4.54169 16.0073 5.00002 16.0073C5.45835 16.0073 5.83335 15.6323 5.83335 15.174V12.674H6.66669L10.8334 15.174V5.17399L6.66669 7.67399Z" />
    <path d="M11.6667 7.38224C12.4334 8.06558 12.9167 9.06558 12.9167 10.1739C12.9167 11.2822 12.4334 12.2822 11.6667 12.9572V7.38224Z" />
  </svg>
);

export const HelpIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="21"
    viewBox="0 0 20 21"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.0003 2.1665C5.40033 2.1665 1.66699 5.89984 1.66699 10.4998C1.66699 15.0998 5.40033 18.8332 10.0003 18.8332C14.6003 18.8332 18.3337 15.0998 18.3337 10.4998C18.3337 5.89984 14.6003 2.1665 10.0003 2.1665ZM10.8337 16.3332H9.16699V14.6665H10.8337V16.3332ZM12.5587 9.87484L11.8087 10.6415C11.392 11.0665 11.092 11.4498 10.942 12.0498C10.8753 12.3165 10.8337 12.6165 10.8337 12.9998H9.16699V12.5832C9.16699 12.1998 9.23366 11.8332 9.35033 11.4915C9.51699 11.0082 9.79199 10.5748 10.142 10.2248L11.1753 9.17484C11.5587 8.80817 11.742 8.25817 11.6337 7.67484C11.5253 7.07484 11.0587 6.5665 10.4753 6.39984C9.55033 6.1415 8.69199 6.6665 8.41699 7.45817C8.31699 7.7665 8.05866 7.99984 7.73366 7.99984H7.48366C7.00033 7.99984 6.66699 7.53317 6.80033 7.0665C7.15866 5.8415 8.20033 4.90817 9.49199 4.70817C10.7587 4.50817 11.967 5.1665 12.717 6.20817C13.7003 7.5665 13.4087 9.02484 12.5587 9.87484V9.87484Z"
    />
  </svg>
);

export const NotificationIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="25"
    viewBox="0 0 24 25"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9996 22.5C13.0996 22.5 13.9996 21.6 13.9996 20.5H9.99956C9.99956 21.6 10.8896 22.5 11.9996 22.5ZM17.9996 16.5V11.5C17.9996 8.43 16.3596 5.86 13.4996 5.18V4.5C13.4996 3.67 12.8296 3 11.9996 3C11.1696 3 10.4996 3.67 10.4996 4.5V5.18C7.62956 5.86 5.99956 8.42 5.99956 11.5V16.5L4.70956 17.79C4.07956 18.42 4.51956 19.5 5.40956 19.5H18.5796C19.4696 19.5 19.9196 18.42 19.2896 17.79L17.9996 16.5Z"
    />
  </svg>
);

export const RoleIcon = ({ fill }: { fill?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill={fill || "currentColor"}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM20 9H15V21C15 21.55 14.55 22 14 22C13.45 22 13 21.55 13 21V16H11V21C11 21.55 10.55 22 10 22C9.45 22 9 21.55 9 21V9H4C3.45 9 3 8.55 3 8C3 7.45 3.45 7 4 7H20C20.55 7 21 7.45 21 8C21 8.55 20.55 9 20 9Z"
    />
  </svg>
);
