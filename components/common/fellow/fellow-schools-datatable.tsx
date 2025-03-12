"use client";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import AttendanceHistory from "#/components/common/fellow/attendance-history";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import FellowDropoutForm from "#/components/common/fellow/fellow-dropout-form";
import { FellowGroupData } from "#/components/common/fellow/fellow-school-datatable-dropdown-menu";
import UploadFellowContract from "#/components/common/fellow/upload-contract";
import UploadFellowID from "#/components/common/fellow/upload-id";
import UploadFellowQualification from "#/components/common/fellow/upload-qualification";
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
import { markFellowAttendance } from "#/lib/actions/fellow";
import { ImplementerRole, Prisma } from "@prisma/client";
import parsePhoneNumberFromString from "libphonenumber-js";
import { InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FellowsData } from "../../../app/(platform)/sc/actions";
import { fellowSchoolsColumns, subColumns } from "./fellow-schools-columns";

export default function FellowSchoolsDatatable({
  fellows,
  project,
  role,
}: {
  fellows: FellowsData[];
  project?: Prisma.ProjectGetPayload<{}>;
  role: ImplementerRole;
}) {
  const [fellow, setFellow] = useState<FellowsData | null>(null);
  const [fellowGroup, setFellowGroup] = useState<FellowGroupData | undefined>();
  const [weeklyEvaluationDialog, setWeeklyEvaluationDialog] = useState(false);
  const [addFellowDialog, setAddFellowDialog] = useState(false);
  const [editFellowDialog, setEditFellowDialog] = useState(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] = useState(false);
  const [uploadContractDialog, setUploadContractDialog] = useState(false);
  const [uploadIdDialog, setUploadIdDialog] = useState(false);
  const [uploadQualificationDialog, setUploadQualificationDialog] =
    useState(false);
  const [complaintsDialog, setComplaintsDialog] = useState(false);
  const [dropOutDialog, setDropOutDialog] = useState(false);
  const [attendanceDialog, setAttendanceDialog] = useState(false);
  const [studentsDialog, setStudentsDialog] = useState(false);
  const [evaluationDialog, setEvaluationDialog] = useState(false);

  function renderTableActions() {
    return role !== "FELLOW" ? (
      <div>
        <FellowDetailsForm
          open={addFellowDialog}
          onOpenChange={setAddFellowDialog}
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
              parsePhoneNumberFromString(
                fellow.cellNumber,
                "KE",
              )?.formatNational()}
          </span>
        </div>
      </DialogAlertWidget>
    );
  }

  function renderFellowGroupDialogAlert(fellowGroup: FellowGroupData) {
    return (
      <DialogAlertWidget>
        <div className="flex items-center gap-2">
          <span>Group {fellowGroup.groupName}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
          <span>{fellowGroup.school.schoolName}</span>
        </div>
      </DialogAlertWidget>
    );
  }

  useEffect(() => {
    setFellow(
      fellows.find((fellow) => fellow.id === fellowGroup?.leaderId) ?? null,
    );
  }, [fellowGroup, fellows]);

  useEffect(() => {
    const group = fellows
      .find((fellow) => fellow.id === fellowGroup?.leaderId)
      ?.groups.find((group) => group.id === fellowGroup?.id);
    setFellowGroup(group);
  }, [fellows]);

  return (
    <>
      <DataTable
        data={fellows}
        columns={fellowSchoolsColumns({
          state: {
            setFellow,
            setWeeklyEvaluationDialog,
            setEditFellowDialog,
            setAttendanceHistoryDialog,
            setUploadContractDialog,
            setUploadIdDialog,
            setUploadQualificationDialog,
            setComplaintsDialog,
            setDropOutDialog,
            role,
          },
        })}
        className={"data-table data-table-action bg-white lg:mt-4"}
        renderTableActions={renderTableActions()}
        emptyStateMessage="No fellows assigned to you"
        columnVisibilityState={{
          "MPESA Name": false,
          "Average Rating": false,
          "Active Status": false,
          County: false,
          "Fellow Email": false,
          "Phone Number": false,
          "ID Number": false,
          "Date of Birth": false,
          Gender: false,
          "Sub-county": false,
        }}
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original.groups}
            editColumns={false}
            columns={subColumns({
              state: {
                setFellowGroup,
                setAttendanceDialog,
                setStudentsDialog,
                setEvaluationDialog,
                role,
              },
            })}
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
          <FellowDetailsForm
            open={editFellowDialog}
            onOpenChange={setEditFellowDialog}
            mode={
              role === "HUB_COORDINATOR"
                ? "view"
                : role === "SUPERVISOR"
                  ? "edit"
                  : null
            }
            fellow={fellow}
          />
          <WeeklyFellowEvaluation
            fellowId={fellow.id}
            open={weeklyEvaluationDialog}
            onOpenChange={setWeeklyEvaluationDialog}
            evaluations={fellow.weeklyFellowRatings}
            project={project}
            mode={"add"}
          >
            {renderFellowDialogAlert(fellow)}
          </WeeklyFellowEvaluation>
          <FellowDropoutForm
            fellow={fellow}
            isOpen={dropOutDialog}
            setIsOpen={setDropOutDialog}
          />
          <AttendanceHistory
            open={attendanceHistoryDialog}
            onOpenChange={setAttendanceHistoryDialog}
            attendances={fellow.attendances}
            fellow={fellow}
            columnVisibilityState={{
              Group: false,
            }}
          >
            {renderFellowDialogAlert(fellow)}
          </AttendanceHistory>
          <UploadFellowContract
            fellow={fellow}
            open={uploadContractDialog}
            onOpenChange={setUploadContractDialog}
          />
          <UploadFellowID
            fellow={fellow}
            open={uploadIdDialog}
            onOpenChange={setUploadIdDialog}
          />
          <UploadFellowQualification
            fellow={fellow}
            open={uploadQualificationDialog}
            onOpenChange={setUploadQualificationDialog}
          />
          <SubmitComplaint
            id={fellow.id}
            open={complaintsDialog}
            onOpenChange={setComplaintsDialog}
            role={role}
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
      {fellowGroup && fellow && (
        <>
          <MarkAttendance
            title={"Mark fellow attendance"}
            attendances={fellowGroup.attendances.map((attendance) => {
              return {
                attendanceId: attendance.id.toString(),
                id: attendance.fellowId,
                attended: attendance.attended ?? null,
                absenceReason: attendance.absenceReason ?? null,
                sessionId: attendance.sessionId!,
                schoolId: attendance.schoolId ?? null,
                comments: attendance.absenceComments,
              };
            })}
            sessions={fellowGroup?.school.interventionSessions}
            id={fellowGroup.leaderId}
            isOpen={attendanceDialog}
            setIsOpen={setAttendanceDialog}
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
                    Please confirm fellow&apos;s M-Pesa number before marking
                    attendance.
                  </span>
                </AlertTitle>
              </Alert>
              <Separator />
            </div>
          </MarkAttendance>
          <StudentsInGroup
            students={fellowGroup.students}
            groupId={fellowGroup.id}
            groupName={fellowGroup.groupName}
            schoolId={fellowGroup.schoolId}
            open={studentsDialog}
            onOpenChange={setStudentsDialog}
          >
            {renderFellowGroupDialogAlert(fellowGroup)}
          </StudentsInGroup>
          <StudentGroupEvaluation
            open={evaluationDialog}
            onOpenChange={setEvaluationDialog}
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
