import TableSkeleton from "#/components/common/table-skeleton";

export default function SessionsDatatableSkeleton() {
  return (
    <TableSkeleton
      rows={5}
      columnNames={[
        "Date of attendance",
        "Last updated",
        "Session type",
        "Assigned supervisor",
        "Session status",
      ]}
    />
  );
}
