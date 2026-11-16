import TableSkeleton from "#/components/common/table-skeleton";

export default function FellowsDatatableSkeleton() {
  return (
    <TableSkeleton
      columnNames={["Name", "Average Rating", "Active Status", "Group Name", "Phone Number"]}
    />
  );
}
