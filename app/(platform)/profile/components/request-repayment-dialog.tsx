import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { AlertTriangleIcon } from "lucide-react";
import * as React from "react";

import { submitRepaymentRequest } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Combobox } from "#/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import { fetchFellowAttendances } from "#/lib/actions/fetch-fellow-attendances";
import { fetchRepaymentRequest } from "#/lib/actions/fetch-repayment-requests";
import { fetchSchools } from "#/lib/actions/fetch-schools";

export function RequestRepaymentDialog({
  fellow,
  children,
}: {
  fellow: Prisma.FellowGetPayload<{}>;
  children: React.ReactNode;
}) {
  const [fellowSchools, setFellowSchools] =
    React.useState<Prisma.SchoolGetPayload<{}>[]>();

  React.useEffect(() => {
    async function initState() {
      if (!fellow.hubId) {
        throw new Error("Fellow does not have a hub");
      }

      const schools = await fetchSchools({ hubId: fellow.hubId });
      setFellowSchools(schools);
    }

    initState();
  }, [fellow.hubId]);

  const [activeSchoolId, setActiveSchoolId] = React.useState<string | null>(
    null,
  );

  const comboboxSchoolResults =
    fellowSchools?.map((school) => ({
      id: school.id,
      name: school.schoolName,
    })) || [];

  const [activeAttendanceId, setActiveAttendanceId] = React.useState<
    number | null
  >(null);

  type FellowAttendanceResults = Awaited<
    ReturnType<typeof fetchFellowAttendances>
  >;
  const [fellowAttendances, setFellowAttendances] =
    React.useState<FellowAttendanceResults>();

  React.useEffect(() => {
    async function fetchAttendances() {
      if (!activeSchoolId) {
        return;
      }

      const attendances = await fetchFellowAttendances({
        where: {
          schoolId: activeSchoolId,
          fellowId: fellow.id,
        },
      });
      setFellowAttendances(attendances);
    }

    fetchAttendances();
  }, [activeSchoolId, fellow.id]);

  const comboxSessionResults =
    fellowAttendances
      ?.filter((attendance) => attendance.attended)
      .map((attendance) => ({
        id: attendance.id,
        name: formatSessionLabel({
          sessionName: attendance.session?.sessionName!,
          sessionDate: attendance.session?.sessionDate,
        }),
      })) || [];

  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!activeAttendanceId) {
      toast({ title: "Please select a session" });
      return;
    }

    if (!fellow.supervisorId) {
      toast({ title: "This fellow does not have a supervisor" });
      return;
    }

    if (!fellow.hubId) {
      toast({ title: "This fellow does not have a hub" });
      return;
    }

    const response = await submitRepaymentRequest({
      supervisorId: fellow.supervisorId,
      fellowId: fellow.id,
      hubId: fellow.hubId,
      fellowAttendanceId: activeAttendanceId,
    });

    if (response.success) {
      setActiveSchoolId(null);
      setActiveAttendanceId(null);
      window.location.reload();
    } else {
      toast({
        title: "Failed to submit repayment request",
        description: response.error,
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="text-lg font-medium">
            Request Repayment for {fellow.fellowName}
          </div>
        </DialogHeader>
        <Separator />
        <div className="my-2 space-y-6">
          <MPESADisclaimer />
        </div>
        <div className="-mb-3.5 flex justify-center text-sm font-medium">
          MPESA Number
        </div>
        <div className="flex justify-center text-4xl font-bold">
          {fellow.mpesaNumber}
        </div>
        <RepaymentRequestHistory fellow={fellow} />
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <SchoolSelector
              schools={comboboxSchoolResults}
              activeSchoolId={activeSchoolId || ""}
              onSelectSchool={(schoolId) => {
                setActiveSchoolId(schoolId);
              }}
            />
          </div>
          <div>
            <AttendanceSelector
              attendances={comboxSessionResults}
              activeAttendanceId={activeAttendanceId || -1}
              onSelectAttendance={setActiveAttendanceId}
            />
          </div>
          <div>
            <Button
              type="submit"
              disabled={!activeSchoolId || !activeAttendanceId}
              className="mt-4 w-full bg-shamiri-blue py-6 text-lg hover:bg-brand"
            >
              Request Repayment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatSessionLabel({
  sessionName,
  sessionDate,
}: {
  sessionName?: string;
  sessionDate?: Date;
}) {
  const formattedDate = sessionDate
    ? format(sessionDate, "dd/MM/yyyy")
    : "Unscheduled";
  return `${sessionName || "N/A"} - ${formattedDate}`;
}

type SchoolSelectorProps = {
  schools: { id: string; name: string }[];
  activeSchoolId: string;
  onSelectSchool: (schoolId: string) => void;
};

export function SchoolSelector({
  schools,
  activeSchoolId,
  onSelectSchool,
}: SchoolSelectorProps) {
  return (
    <Combobox
      items={schools.map((school) => ({
        id: school.id,
        label: school.name,
      }))}
      activeItemId={activeSchoolId}
      onSelectItem={onSelectSchool}
      placeholder="Select school..."
    />
  );
}

export function AttendanceSelector({
  attendances,
  activeAttendanceId,
  onSelectAttendance,
}: {
  attendances: { id: number; name: string }[];
  activeAttendanceId: number;
  onSelectAttendance: (attendanceId: number) => void;
}) {
  return (
    <Combobox
      items={attendances.map((attendance) => ({
        id: attendance.id.toString(),
        label: attendance.name,
      }))}
      activeItemId={activeAttendanceId.toString()}
      onSelectItem={(id: string) => onSelectAttendance(parseInt(id))}
      placeholder="Select session..."
    />
  );
}

function MPESADisclaimer() {
  return (
    <div className="rounded-lg bg-yellow-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangleIcon
            className="h-5 w-5 text-yellow-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Confirm the below MPESA number is the correct one for this fellow.
            If it is not, please edit the information before requesting a
            repayment.
          </p>
        </div>
      </div>
    </div>
  );
}

function RepaymentRequestHistory({
  fellow,
}: {
  fellow: Prisma.FellowGetPayload<{}>;
}) {
  type RepaymentRequestResults = Awaited<
    ReturnType<typeof fetchRepaymentRequest>
  >;
  const [repaymentRequests, setRepaymentRequests] =
    React.useState<RepaymentRequestResults>([]);

  if (repaymentRequests.length === 0) {
    return null;
  }

  return (
    <div className="my-2 space-y-2">
      <h2 className="mb-2 text-sm font-medium">
        {repaymentRequests.length} Previous Requests
      </h2>
      <table className="w-full table-auto text-xs">
        <thead className="rounded-xl bg-zinc-100 text-xs text-zinc-700">
          <tr>
            <th className="px-2 py-1">Date</th>
            <th className="px-2 py-1">Session</th>
            <th className="px-2 py-1">MPESA</th>
          </tr>
        </thead>
        <tbody>
          {repaymentRequests.map((request) => (
            <tr key={request.id} className="border-gray-200 text-center">
              <td className="px-2 py-1">
                {format(new Date(request.createdAt), "dd/MM/yyyy")}
              </td>
              <td className="px-2 py-1">
                {request.fellowAttendance.school.schoolName} — Session{" "}
                {request.fellowAttendance.session?.sessionType || "N/A"}
              </td>
              <td className="px-2 py-1">{fellow.mpesaNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
