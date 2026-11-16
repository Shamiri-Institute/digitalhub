import TableSkeleton from "#/components/common/table-skeleton";

export default function StudentsDatatableSkeleton() {
  return (
    <TableSkeleton
      columnNames={["Student Name", "Group Name", "Attendance history", "Questionnaire", "Status"]}
    />
  );
}
