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

type RequestRepaymentFellow = Prisma.FellowGetPayload<{
  include: {
    repaymentRequests: {
      include: {
        groupSession: {
          include: {
            session: {
              include: {
                school: true;
              };
            };
          };
        };
      };
    };
    groupSessions: {
      include: {
        session: {
          include: {
            school: true;
          };
        };
      };
    };
  };
}>;

export function RequestRepaymentDialog({
  fellow,
  children,
}: {
  fellow: RequestRepaymentFellow;
  children: React.ReactNode;
}) {
  const [activeSchoolId, setActiveSchoolId] = React.useState<string | null>(
    null,
  );

  // This dedupes the schools in the group sessions
  const schools = fellow.groupSessions.reduce<{ id: string; name: string }[]>(
    (unique, groupSession) => {
      if (
        !unique.find((school) => school.id === groupSession.session.school.id)
      ) {
        unique.push({
          id: groupSession.session.school.id,
          name: groupSession.session.school.schoolName,
        });
      }
      return unique;
    },
    [],
  );

  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(
    null,
  );

  // Sessions based on school selected
  const sessions = fellow.groupSessions
    .filter((groupSession) => groupSession.session.school.id === activeSchoolId)
    .reduce<{ id: string; name: string }[]>((unique, groupSession) => {
      const sessionExists = unique.some(
        (session) => session.id === groupSession.session.id,
      );
      const sessionDate = groupSession.session.occurringAt
        ? format(new Date(groupSession.session.occurringAt), "dd/MM/yyyy")
        : "Unscheduled";

      if (!sessionExists) {
        unique.push({
          id: groupSession.id,
          name: `${groupSession.session.sessionName} - ${sessionDate}`,
        });
      }
      return unique;
    }, []);

  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!activeSessionId) {
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
      groupSessionId: activeSessionId,
    });

    if (response.success) {
      setActiveSchoolId(null);
      setActiveSessionId(null);
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
        <RepaymentRequestHistory
          fellow={fellow}
          repaymentRequests={fellow.repaymentRequests}
        />
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <SchoolSelector
              schools={schools}
              activeSchoolId={activeSchoolId || ""}
              onSelectSchool={(schoolId) => {
                setActiveSchoolId(schoolId);
              }}
            />
          </div>
          <div>
            <SessionSelector
              sessions={sessions}
              activeSessionId={activeSessionId || ""}
              onSelectSession={(sessionId) => {
                setActiveSessionId(sessionId);
              }}
            />
          </div>
          <div>
            <Button
              type="submit"
              disabled={!activeSchoolId || !activeSessionId}
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

type SessionSelectorProps = {
  sessions: { id: string; name: string }[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
};

export function SessionSelector({
  sessions,
  activeSessionId,
  onSelectSession,
}: SessionSelectorProps) {
  return (
    <Combobox
      items={sessions.map((session) => ({
        id: session.id,
        label: session.name,
      }))}
      activeItemId={activeSessionId}
      onSelectItem={onSelectSession}
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
  repaymentRequests,
}: {
  fellow: Prisma.FellowGetPayload<{}>;
  repaymentRequests: Prisma.RepaymentRequestGetPayload<{
    include: {
      groupSession: {
        include: {
          session: {
            include: {
              school: true;
            };
          };
        };
      };
    };
  }>[];
}) {
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
                {request.groupSession.session.school.schoolName} — Session{" "}
                {request.groupSession.session.sessionType}
              </td>
              <td className="px-2 py-1">{fellow.mpesaNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
