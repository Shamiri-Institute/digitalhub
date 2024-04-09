import { db } from "#/lib/db";

export default async function FellowsPage({ params: { visibleId } }: { params: { visibleId: string } }) {
  const fellows = await db.fellow.findMany({
    where: {
      groups: {
        some: {
          school: {
            visibleId
          }
        }

      }
    },
    include: {
      groups: {
        where: {
          school: {
            visibleId
          }
        }
      },
      supervisor: true
    }
  })

  console.log(JSON.stringify(fellows, null, 2))
  return <div>Fellows data goes here</div>;
}
