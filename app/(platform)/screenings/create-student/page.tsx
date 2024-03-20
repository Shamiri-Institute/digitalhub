import CreateNonShamiriStudentPage from "#/app/(platform)/screenings/create-student/create-nonshamirian";
import { getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";
import { notFound } from "next/navigation";

export default async function Page() {
  const supervisor = await getCurrentUser();

  console.log({ supervisor });

  if (!supervisor) {
    return notFound();
  }

  const schools = await db.school.findMany({
    where: {
      hub: {
        implementerId: supervisor.membership.implementerId,
      },
    },
  });

  const { membership } = supervisor;

  console.log({ schools });
  return (
    <>
      <CreateNonShamiriStudentPage
        schools={schools}
        implementerId={membership.implementerId}
        supervisorId={supervisor.membership.identifier!}
      />
    </>
  );
}
