import StudentsFilterToggle from "#/app/(platform)/hc/students/components/students-filter-toggle";
import { SearchCommand } from "#/components/search-command";
import { db } from "#/lib/db";

export default async function StudentsFilterTab({
  hubCoordinatorId,
}: {
  hubCoordinatorId: string;
}) {
  const studentsInHub = await db.student.findMany({
    where: {
      school: {
        hubId: hubCoordinatorId,
      },
    },
  });

  return (
    <div className="flex items-center justify-between">
      <div className="flex w-1/4 gap-3">
        <SearchCommand data={[]} />
        <StudentsFilterToggle students={[]} />
      </div>
    </div>
  );
}
