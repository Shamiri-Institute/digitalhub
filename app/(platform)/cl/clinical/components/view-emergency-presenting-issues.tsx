import { emergency_presenting_issues } from "#/app/(platform)/sc/clinical/components/clinical-diagnosing-board";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";

export default function ViewEmergencyPresentingIssues({
  emergencyPresentingIssuesBaseline,
  emergencyPresentingIssuesEndpoint,
}: {
  emergencyPresentingIssuesBaseline: Record<string, unknown> | null;
  emergencyPresentingIssuesEndpoint: Record<string, unknown> | null;
}) {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[50%] border">
              Emergency Presenting Issues
            </TableHead>
            <TableHead className="w-[25%] border text-center">
              Baseline
            </TableHead>
            <TableHead className="w-[25%] border text-center">
              Endline
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emergency_presenting_issues.map((issue) => (
            <TableRow key={issue.id} className="hover:bg-gray-50">
              <TableCell className="border font-medium">{issue.name}</TableCell>
              <TableCell className="border" style={{ textAlign: "center" }}>
                {emergencyPresentingIssuesBaseline?.[issue.name] !== undefined
                  ? String(emergencyPresentingIssuesBaseline?.[issue.name])
                  : "-"}
              </TableCell>
              <TableCell className="border" style={{ textAlign: "center" }}>
                {emergencyPresentingIssuesEndpoint?.[issue.name] !== undefined
                  ? String(emergencyPresentingIssuesEndpoint?.[issue.name])
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
