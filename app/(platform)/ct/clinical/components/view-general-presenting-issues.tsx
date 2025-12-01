import { general_presenting_issues } from "#/app/(platform)/sc/clinical/components/clinical-diagnosing-board";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Textarea } from "#/components/ui/textarea";

export default function ViewGeneralPresentingIssues({
  generalPresentingIssuesBaseline,
  generalPresentingIssuesEndpoint,
  generalPresentingIssuesOtherSpecifiedBaseline,
  generalPresentingIssuesOtherSpecifiedEndpoint,
}: {
  generalPresentingIssuesBaseline: Record<string, unknown> | null;
  generalPresentingIssuesEndpoint: Record<string, unknown> | null;
  generalPresentingIssuesOtherSpecifiedBaseline?: string | null;
  generalPresentingIssuesOtherSpecifiedEndpoint?: string | null;
}) {
  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[50%] border">General Presenting Issues</TableHead>
              <TableHead className="w-[25%] border text-center">Baseline</TableHead>
              <TableHead className="w-[25%] border text-center">Endline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {general_presenting_issues.map((issue) => (
              <TableRow key={issue.id} className="hover:bg-gray-50">
                <TableCell className="border font-medium">{issue.name}</TableCell>
                <TableCell className="border text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      id={`baseline-${issue.id}`}
                      checked={generalPresentingIssuesBaseline?.[issue.name] === "true"}
                      disabled
                    />
                  </div>
                </TableCell>
                <TableCell className="border text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      id={`endline-${issue.id}`}
                      checked={generalPresentingIssuesEndpoint?.[issue.name] === "true"}
                      disabled
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="other-issues">
          Other Issues
        </label>
        <Textarea
          id="other-issues"
          placeholder="Describe any other presenting issues..."
          className="min-h-[100px]"
          value={
            generalPresentingIssuesOtherSpecifiedBaseline ||
            generalPresentingIssuesOtherSpecifiedEndpoint ||
            ""
          }
          disabled
        />
      </div>
    </div>
  );
}
