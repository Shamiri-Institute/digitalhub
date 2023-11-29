import { Icons } from "#/components/icons";
import { db } from "#/lib/db";
import { SchoolCard } from "./school-card";

export default function SchoolsPage() {
  return (
    <>
      <Header />
      <SchoolsList />
    </>
  );
}

function Header() {
  return (
    <div className="mt-4 flex items-center justify-between py-4 lg:mt-0">
      <div className="bg-green flex items-center align-middle">
        <Icons.schoolMinusOutline className="mr-4 h-6 w-6 align-baseline text-brand" />
        <h3 className="text-2xl font-semibold text-brand">Schools</h3>
      </div>
      <Icons.search className="mr-4 h-6 w-6 align-baseline text-brand" />
    </div>
  );
}

async function SchoolsList() {
  const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];
  // const assignedSchool = {
  //   name: "Maranda Sec School",
  //   population: 1400,
  //   sessions: ["Pre", "S1"],
  //   fellowsCount: 15,
  //   type: "Public",
  //   county: "Nairobi",
  //   pointPerson: "Benny Otieno",
  //   contactNo: "+254712342314780",
  //   demographics: "Mixed",
  // };
  const assignedSchoolId = "ANS23_School_17";
  const assignedSchool = await db.school.findFirst({
    where: {
      visibleId: assignedSchoolId,
    },
  });
  if (!assignedSchool) {
    throw new Error("Assigned school not found");
  }

  const otherSchools = await db.school.findMany({
    where: {
      visibleId: { not: assignedSchoolId },
      hubId: assignedSchool.hubId,
    },
  });

  return (
    <div>
      <div>
        <h2 className="py-3 text-xl font-semibold">My School</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2  xl:grid-cols-3">
          <SchoolCard
            key={assignedSchool.schoolName}
            school={assignedSchool}
            sessionTypes={sessionTypes}
            assigned
          />
          <div />
          <div />
        </div>
      </div>
      <div>
        <h2 className="py-3 text-xl font-semibold">Others</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2  xl:grid-cols-3">
          {otherSchools.map((school) => (
            <SchoolCard
              key={school.schoolName}
              school={school}
              sessionTypes={sessionTypes}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
