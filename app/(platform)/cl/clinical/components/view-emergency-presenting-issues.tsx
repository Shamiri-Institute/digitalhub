import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";

const emergency_presenting_issues = [
  { id: 1, name: "Bullying" },
  { id: 2, name: "Substance abuse" },
  { id: 3, name: "Sexual abuse" },
  { id: 4, name: "Suicidality" },
  { id: 5, name: "Self-harm" },
  { id: 6, name: "Child abuse" },
];

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
              <TableCell className="border">
                {emergencyPresentingIssuesBaseline?.[issue.name] !== undefined
                  ? String(emergencyPresentingIssuesBaseline?.[issue.name])
                  : "N/A"}
              </TableCell>
              <TableCell className="border">
                {emergencyPresentingIssuesEndpoint?.[issue.name] !== undefined
                  ? String(emergencyPresentingIssuesEndpoint?.[issue.name])
                  : "N/A"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
