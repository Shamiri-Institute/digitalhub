import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
export default async function SchoolPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const school = await db.school.findFirst({
    where: {
      visibleId,
    },
    include: {
      _count: {
        select: {
          interventionSessions: true,
          students: true,
          interventionGroups: {
            where: {
              archivedAt: null,
            },
          },
        },
      },
    },
  });

  const avatarContent = school?.schoolName
    .split(" ")
    .filter((i) => i.toLowerCase() !== "school")
    .map((i) => i[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex">
      <div className="space-y-6 border-r-shamiri-light-grey px-6 py-8">
        <div className="flex items-center gap-x-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-shamiri-new-light-blue p-[18px] text-xl font-semibold text-shamiri-new-blue">
            {avatarContent}
          </div>
          <h2 className="text-[28px] font-semibold text-black">
            {school?.schoolName}
          </h2>
        </div>
        <Separator />
        <div>Session pills go here</div>
        <div></div>
      </div>
      <div>Some data comes here</div>
    </div>
  );
}
