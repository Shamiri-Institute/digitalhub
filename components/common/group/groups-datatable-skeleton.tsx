import TableSkeleton from "#/components/common/table-skeleton";

export default function GroupsDatatableSkeleton({ rows }: { rows?: number }) {
  return (
    <TableSkeleton
      rows={rows}
      columnNames={[
        "Group",
        "Group Rating",
        "Supervisor",
        "Fellow",
        "No. of students",
        "Group Type",
      ]}
    />
  );
}
