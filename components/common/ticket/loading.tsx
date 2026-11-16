import TableSkeleton from "#/components/common/table-skeleton";

export default function TicketsLoading() {
  return (
    <TableSkeleton
      rows={5}
      columnNames={["Created Date", "Subject", "Category", "Priority", "Current Tier", "Status"]}
    />
  );
}
