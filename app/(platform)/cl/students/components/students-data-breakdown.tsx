import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

export default function StudentsDataBreakdown({
  graphData,
}: {
  graphData: any;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Students Data Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Total Students</p>
            <p className="text-lg font-bold">100</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
