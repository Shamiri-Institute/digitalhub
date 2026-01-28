import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, X } from "lucide-react";
import { useState } from "react";
import {
  type ClinicalCases,
  updateClinicalCaseAttendance,
} from "#/app/(platform)/sc/clinical/action";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { toast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

export const CLINICAL_SESSION_TYPES = [
  { key: "Pre", value: "Pre-session" },
  { key: "S1", value: "Clinical S1" },
  { key: "S2", value: "Clinical S2" },
  { key: "S3", value: "Clinical S3" },
  { key: "S4", value: "Clinical S4" },
  { key: "F1", value: "Follow-Up 1" },
  { key: "F2", value: "Follow-Up 2" },
  { key: "F3", value: "Follow-Up 3" },
  { key: "F4", value: "Follow-Up 4" },
  // { key: 'F5', value: 'Follow-Up 5' },
  // { key: 'F6', value: 'Follow-Up 6' },
  // { key: 'F7', value: 'Follow-Up 7' },
  // { key: 'F8', value: 'Follow-Up 8' },
] as const;

export default function ViewMarkClinicalSessions({
  currentcase,
  userRole = "SUPERVISOR",
}: {
  currentcase: ClinicalCases;
  userRole: "CLINICAL_LEAD" | "SUPERVISOR";
}) {
  const [attendance, setAttendance] = useState<Record<string, boolean | null>>(() => {
    const initialState: Record<string, boolean | null> = {};
    currentcase?.clinicalSessionAttendance?.forEach((record) => {
      initialState[record.session] = record.attendanceStatus;
    });
    return initialState;
  });

  const [dates, setDates] = useState<Record<string, Date | undefined>>(() => {
    const initialDates: Record<string, Date | undefined> = {};
    currentcase.clinicalSessionAttendance?.forEach((record) => {
      initialDates[record.session] = record.date;
    });
    return initialDates;
  });

  const handleAttendance = async (session: string, status: boolean) => {
    if (!dates[session]) {
      toast({
        variant: "destructive",
        title: "Date is required",
        description: "Please select a date for this session before marking attendance",
      });
      return;
    }

    try {
      const response = await updateClinicalCaseAttendance({
        supervisorId: currentcase?.currentSupervisorId || null,
        caseId: currentcase.id,
        session: session,
        dateOfSession: dates[session] ?? new Date(),
        attendanceStatus: status,
        role: userRole,
        clinicalLeadId: currentcase?.clinicalLeadId || null,
      });

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: "Failed to update session attendance",
        });
        return;
      }

      setAttendance((prev) => ({
        ...prev,
        [session]: status,
      }));

      toast({
        variant: "default",
        title: "Session attendance recorded successfully",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update session attendance",
      });
    }
  };

  const handleDateSelect = (session: string, date: Date | undefined) => {
    setDates((prev) => ({
      ...prev,
      [session]: date,
    }));
  };

  return (
    <div className="w-full space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="border">Session</TableHead>
            <TableHead className="border">Date</TableHead>
            <TableHead className="w-[140px] border">Attendance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {CLINICAL_SESSION_TYPES.filter(
            (sessionType): sessionType is (typeof CLINICAL_SESSION_TYPES)[number] => {
              if (sessionType.key.startsWith("S") || sessionType.key === "Pre") {
                return true;
              }
              return currentcase.caseStatus === "FollowUp";
            },
          ).map((sessionType) => (
            <TableRow key={sessionType.key} className="hover:bg-gray-50">
              <TableCell className="border font-medium">{sessionType.value}</TableCell>
              <TableCell className="border">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dates[sessionType.key] && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {(() => {
                        const date = dates[sessionType.key];
                        return date ? format(date, "dd MMM yyyy") : <span>Pick a date</span>;
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dates[sessionType.key]}
                      onSelect={(date) => handleDateSelect(sessionType.key, date)}
                      captionLayout="dropdown"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </TableCell>
              <TableCell className="w-[140px] border p-0">
                {attendance[sessionType.key] !== null &&
                attendance[sessionType.key] !== undefined ? (
                  <div className="p-2">
                    <Badge
                      variant={attendance[sessionType.key] ? "shamiri-green" : "destructive"}
                      className="w-20 justify-center"
                    >
                      {attendance[sessionType.key] ? (
                        <>
                          <Check className="mr-1 h-3 w-3" /> Attended
                        </>
                      ) : (
                        <>
                          <X className="mr-1 h-3 w-3" /> Missed
                        </>
                      )}
                    </Badge>
                  </div>
                ) : (
                  <div className="grid h-full grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleAttendance(sessionType.key, true)}
                      className="flex items-center justify-center border-r p-3 text-green-600 transition-colors hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttendance(sessionType.key, false)}
                      className="flex items-center justify-center p-3 text-red-600 transition-colors hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
