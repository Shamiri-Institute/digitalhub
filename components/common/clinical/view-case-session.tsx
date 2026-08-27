import { CLINICAL_SESSION_TYPES } from "#/app/(platform)/sc/clinical/components/view-mark-clinical-sessions";
import { Badge } from "#/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "#/components/ui/table";

export default function ViewCaseSessions({
  initialContact,
  upcomingSession,
  noOfClinicalSessions,
  caseStatus,
}: {
  initialContact: string;
  upcomingSession: string;
  noOfClinicalSessions: number;
  caseStatus: string;
}) {
  return (
    <div className="w-full">
      <Table>
        <TableBody>
          <TableRow className="hover:bg-gray-50">
            <TableCell className="border font-medium">No. of clinical sessions</TableCell>
            <TableCell className="border">{noOfClinicalSessions}</TableCell>
          </TableRow>
          <TableRow className="hover:bg-gray-50">
            <TableCell className="border font-medium">Upcoming session</TableCell>
            <TableCell className="border">{getNextSession(upcomingSession)}</TableCell>
          </TableRow>
          <TableRow className="hover:bg-gray-50">
            <TableCell className="border font-medium">Initial contact</TableCell>
            <TableCell className="border">{initialContact}</TableCell>
          </TableRow>
          <TableRow className="hover:bg-gray-50">
            <TableCell className="border font-medium">Case status</TableCell>
            <TableCell className="border">
              <Badge variant="warning">{caseStatus}</Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function getNextSession(upcomingSession: string) {
  if (!upcomingSession) return "N/A";
  const sessionIndex = CLINICAL_SESSION_TYPES.findIndex(
    (session) => session.key === upcomingSession,
  );
  return CLINICAL_SESSION_TYPES[sessionIndex + 1]?.key ?? "N/A";
}
