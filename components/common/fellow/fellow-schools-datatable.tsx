"use client";
import {
  type FellowPersonalDetails,
  loadFellowPersonalDetails,
} from "#/app/(platform)/hc/fellows/actions";
import type { ImplementerRole } from "#/db/enums";
import parsePhoneNumberFromString from "libphonenumber-js";
import { InfoIcon } from "lucide-react";
import { type SetStateAction, useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import AttendanceHistory from "#/components/common/fellow/attendance-history";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import type { FellowGroupData } from "#/components/common/fellow/fellow-school-datatable-dropdown-menu";
import WeeklyFellowEvaluation from "#/components/common/fellow/weekly-fellow-evaluation";
import StudentGroupEvaluation from "#/components/common/group/student-group-evaluation";
import { MarkAttendance } from "#/components/common/mark-attendance";
import StudentsInGroup from "#/components/common/student/students-in-group";
import SubmitComplaint from "#/components/common/submit-complaint";
import DataTable from "#/components/data-table";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toastOnError } from "#/components/ui/use-toast";
import { markFellowAttendance } from "#/lib/actions/fellow";
import type { FellowsData } from "../../../app/(platform)/sc/actions";
import {
  type FellowDialogKind,
  type FellowGroupDialogKind,
  fellowSchoolsColumns,
  subColumns,
} from "./fellow-schools-columns";
import type { project as projectTable } from "#/db/schema";

type OpenFellowDialog =
  | { kind: "add" }
  | { kind: "edit"; fellowId: string; personalDetails: FellowPersonalDetails }
  | { kind: FellowDialogKind; fellowId: string }
  | { kind: FellowGroupDialogKind; fellowId: string; groupId: string };

export default function FellowSchoolsDatatable({
  fellows,
  project,
  role,
}: {
  fellows: FellowsData[];
  project?: typeof projectTable.$inferSelect;
  role: ImplementerRole;
}) {
  const [dialog, setDialog] = useState<OpenFellowDialog | null>(null);
  const fellow =
    dialog && dialog.kind !== "add" ? fellows.find((f) => f.id === dialog.fellowId) : undefined;
  const fellowGroup =
    dialog && "groupId" in dialog ? fellow?.groups.find((g) => g.id === dialog.groupId) : undefined;
  const fellowPersonalDetails = dialog?.kind === "edit" ? dialog.personalDetails : undefined;

  const onDialogOpenChange = (open: SetStateAction<boolean>) => {
    if (!open) setDialog(null);
  };

  const openEditDialog = toastOnError(async ({ id: fellowId }: FellowsData) => {
    const personalDetails = await loadFellowPersonalDetails(fellowId);
    setDialog({ kind: "edit", fellowId, personalDetails });
  });

  const mainColumns = fellowSchoolsColumns({
    state: {
      openDialog: (kind, { id: fellowId }) => setDialog({ kind, fellowId }),
      openEditDialog,
      role,
    },
  });

  const groupColumns = subColumns({
    state: {
      openDialog: (kind, { id: groupId, leaderId: fellowId }) =>
        setDialog({ kind, fellowId, groupId }),
      role,
    },
  });

  function renderTableActions() {
    return role !== "FELLOW" ? (
      <div>
        <FellowDetailsForm
          open={dialog?.kind === "add"}
          onOpenChange={(open) => setDialog(open ? { kind: "add" } : null)}
          mode={"add"}
        >
          <DialogTrigger asChild={true}>
            <Button variant="brand">Add new fellow</Button>
          </DialogTrigger>
        </FellowDetailsForm>
      </div>
    ) : null;
  }

  function renderFellowDialogAlert(fellow: FellowsData) {
    return (
      <DialogAlertWidget>
        <div className="flex items-center gap-2">
          <span>{fellow.fellowName}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
          <span>
            {fellow.cellNumber &&
              parsePhoneNumberFromString(fellow.cellNumber, "KE")?.formatNational()}
          </span>
        </div>
      </DialogAlertWidget>
    );
  }

  function renderFellowGroupDialogAlert(fellowGroup: FellowGroupData) {
    return (
      <DialogAlertWidget>
        <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
          <span>Group {fellowGroup.groupName}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
          <span>{fellowGroup.school.schoolName}</span>
        </div>
      </DialogAlertWidget>
    );
  }

  return (
    <>
      <DataTable
        data={fellows}
        columns={mainColumns}
        className={"data-table data-table-action bg-white lg:mt-4"}
        renderTableActions={renderTableActions()}
        emptyStateMessage="No fellows assigned to you"
        columnVisibilityState={{
          "Average Rating": false,
          "Active Status": false,
          County: false,
          "Fellow Email": false,
          "Phone Number": false,
          Gender: false,
          "Sub-county": false,
        }}
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original.groups}
            editColumns={false}
            columns={groupColumns}
            disableSearch={true}
            disablePagination={true}
            className={"data-table data-table-action mt-0 border-0 bg-white"}
            emptyStateMessage="No groups assigned to this fellow"
            isSubComponent={true}
          />
        )}
      />
      {fellow && (
        <>
          <WeeklyFellowEvaluation
            fellowId={fellow.id}
            open={dialog?.kind === "weeklyEvaluation"}
            onOpenChange={onDialogOpenChange}
            evaluations={fellow.weeklyFellowRatings}
            project={project}
            mode={"add"}
          >
            {renderFellowDialogAlert(fellow)}
          </WeeklyFellowEvaluation>
          <AttendanceHistory
            open={dialog?.kind === "attendanceHistory"}
            onOpenChange={onDialogOpenChange}
            attendances={fellow.attendances}
            fellow={fellow}
            columnVisibilityState={{
              Group: false,
            }}
          >
            {renderFellowDialogAlert(fellow)}
          </AttendanceHistory>
          <SubmitComplaint
            id={fellow.id}
            open={dialog?.kind === "complaints"}
            onOpenChange={onDialogOpenChange}
            complaints={fellow.complaints.map((complaint) => {
              return {
                id: complaint.id,
                createdBy: complaint.user ?? undefined,
                createdAt: complaint.createdAt,
                complaint: complaint.complaint,
                comments: complaint.comments ?? undefined,
              };
            })}
          >
            {renderFellowDialogAlert(fellow)}
          </SubmitComplaint>
        </>
      )}
      {fellow && fellowPersonalDetails && (
        <FellowDetailsForm
          open={dialog?.kind === "edit"}
          onOpenChange={onDialogOpenChange}
          mode={role === "HUB_COORDINATOR" ? "view" : role === "SUPERVISOR" ? "edit" : null}
          fellow={{ ...fellow, ...fellowPersonalDetails }}
        />
      )}
      {fellowGroup && (
        <>
          <MarkAttendance
            title={"Mark fellow attendance"}
            attendances={fellowGroup.attendances.map((attendance) => {
              return {
                attendanceId: attendance.id.toString(),
                id: attendance.fellowId,
                attended: attendance.attended ?? null,
                absenceReason: attendance.absenceReason ?? null,
                sessionId: attendance.sessionId ?? "",
                comments: attendance.absenceComments,
              };
            })}
            sessions={fellowGroup.school.interventionSessions}
            id={fellowGroup.leaderId}
            isOpen={dialog?.kind === "markAttendance"}
            setIsOpen={onDialogOpenChange}
            markAttendanceAction={markFellowAttendance}
            sessionMode="many"
            bulkMode={false}
          >
            <div className="flex flex-col gap-y-3">
              {renderFellowGroupDialogAlert(fellowGroup)}
              <Alert variant="destructive">
                <AlertTitle className="flex gap-2">
                  <InfoIcon className="mt-1 h-4 w-4 shrink-0" />
                  <span className="text-base">
                    Please confirm fellow&apos;s M-Pesa number before marking attendance.
                  </span>
                </AlertTitle>
              </Alert>
              {fellowGroup.students.length === 0 && role !== "FELLOW" && (
                <Alert>
                  <AlertTitle className="flex gap-2">
                    <InfoIcon className="mt-1 h-4 w-4 shrink-0" />
                    <span className="text-base">
                      This group has no students. Please contact the Fellow to add them.
                    </span>
                  </AlertTitle>
                </Alert>
              )}
              <Separator />
            </div>
          </MarkAttendance>
          <StudentsInGroup
            students={fellowGroup.students}
            groupId={fellowGroup.id}
            groupName={fellowGroup.groupName}
            schoolId={fellowGroup.schoolId}
            open={dialog?.kind === "students"}
            onOpenChange={onDialogOpenChange}
            role={role}
          >
            {renderFellowGroupDialogAlert(fellowGroup)}
          </StudentsInGroup>
          <StudentGroupEvaluation
            open={dialog?.kind === "groupEvaluation"}
            onOpenChange={onDialogOpenChange}
            mode="add"
            groupId={fellowGroup.id}
            evaluations={fellowGroup.interventionGroupReports}
            sessions={fellowGroup.school.interventionSessions}
          >
            {renderFellowGroupDialogAlert(fellowGroup)}
          </StudentGroupEvaluation>
        </>
      )}
    </>
  );
}
