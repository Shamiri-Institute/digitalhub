import { ImplementerRole } from "#/db/enums";
import TableSkeleton from "#/components/common/table-skeleton";

export default function SchoolsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <TableSkeleton
      columnNames={[
        "School name",
        "County",
        "Expected number of students",
        "Point supervisor",
        "Upcoming session",
        ...(role === ImplementerRole.FELLOW ? [] : ["Report submission"]),
        "Date added",
        "Type",
        ...(role === ImplementerRole.FELLOW ? [] : ["Active status"]),
      ]}
    />
  );
}
