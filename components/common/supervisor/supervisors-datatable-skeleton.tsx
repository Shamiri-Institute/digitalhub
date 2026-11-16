import TableSkeleton from "#/components/common/table-skeleton";

export default function SupervisorsDatatableSkeleton() {
  return (
    <TableSkeleton
      columnNames={["Name", "Assigned school", "Attendance history", "No. of fellows"]}
    />
  );
}
