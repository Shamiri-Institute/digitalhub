import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

const ids = {
  implementers: {
    SHAMIRI: {
      id: objectId("impl"),
      visibleId: "SHA",
      implementerName: "Shamiri Institute",
      implementerType: "NNGO",
      implementerAddress:
        "13th Floor, Pioneer Point (CMS-Africa)\nChania Avenue, Nairobi, Kenya",
      pointPersonName: "Tom Osborn",
      pointPersonPhone: "+254 (0) 11 254 0760",
      pointPersonEmail: "team@shamiri.institute",
      countyOfOperation: "Nairobi",

      projects: {
        "2024_Project_1": {
          id: objectId("proj"),
          visibleId: "2024_Project_1",
          projectName: "Anansi 100K Phase 1",

          hubs: {
            "24_Hub_01": {
              id: objectId("hub"),
              visibleId: "24_Hub_01",
              hubName: "Dagoretti/Westlands",

              fellows: {
                Fellow_01: {
                  id: objectId("fel"),
                  visibleId: "TFW24_S_01",
                  fellowName: "John Doe",
                  fellowEmail: "johndoe@example.com",
                  mpesaName: "John Doe",
                  mpesaNumber: "+254700000001",
                  idNumber: "12345678",
                  cellNumber: "+254700000001",
                  county: "Nairobi",
                  subCounty: "Westlands",
                  dateOfBirth: new Date("1999-01-01"),
                  gender: "Male",
                  hubId: objectId("hub"),
                },
                Fellow_02: {
                  id: objectId("fel"),
                  visibleId: "TFW24_S_02",
                  fellowName: "Jane Doe",
                  fellowEmail: "janedoe@example.com",
                  mpesaName: "Jane Doe",
                  mpesaNumber: "+254700000002",
                  idNumber: "87654321",
                  cellNumber: "+254700000002",
                  county: "Nairobi",
                  subCounty: "Dagoretti",
                  dateOfBirth: new Date("2000-02-02"),
                  gender: "Female",
                  hubId: objectId("hub"),
                },
              },

              schools: {
                ANS24_School_07: {
                  id: objectId("sch"),
                  visibleId: "ANS24_School_07",
                  schoolName: "Dagoretti High School",
                  schoolType: "National",
                  schoolEmail: "dagoretti@example.com",
                  schoolCounty: "Nairobi",
                  schoolDemographics: "Boys",
                  pointPersonId: "746229367",
                  pointPersonName: "Ephantus Kiura Muriuki",
                  pointPersonPhone: "+254 722 229 367",
                  numbersExpected: 2200,
                  principalName: "L. O. Nyachwera",

                  students: {
                    Student_01: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_01",
                      studentName: "Alice Mwangi",
                      admissionNumber: "ADM123",
                      dateOfBirth: new Date("2005-05-05"),
                      gender: "Female",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_01",
                    },
                    Student_02: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_02",
                      studentName: "Bob Otieno",
                      admissionNumber: "ADM124",
                      dateOfBirth: new Date("2006-06-06"),
                      gender: "Male",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_01",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

async function seedDatabase() {
  await truncateTables();

  for (const implementer of Object.values(ids.implementers)) {
    await db.implementer.create({
      data: {
        id: implementer.id,
        visibleId: implementer.visibleId,
        implementerName: implementer.implementerName,
        implementerType: implementer.implementerType,
        implementerAddress: implementer.implementerAddress,
        pointPersonName: implementer.pointPersonName,
        pointPersonPhone: implementer.pointPersonPhone,
        pointPersonEmail: implementer.pointPersonEmail,
        countyOfOperation: implementer.countyOfOperation,
      },
    });

    for (const project of Object.values(implementer.projects)) {
      const createdProject = await db.project.create({
        data: {
          id: project.id,
          visibleId: project.visibleId,
          projectName: project.projectName,
        },
      });

      await db.projectImplementer.create({
        data: {
          implementerId: implementer.id,
          projectId: createdProject.id,
        },
      });

      for (const hub of Object.values(project.hubs)) {
        const createdHub = await db.hub.create({
          data: {
            id: hub.id,
            visibleId: hub.visibleId,
            hubName: hub.hubName,
            implementerId: implementer.id, // TODO: remove; projectImplementer replaces this
            projectId: createdProject.id,
          },
        });

        for (const fellow of Object.values(hub.fellows)) {
          await db.fellow.create({
            data: {
              id: fellow.id,
              visibleId: fellow.visibleId,
              fellowName: fellow.fellowName,
              fellowEmail: fellow.fellowEmail,
              mpesaName: fellow.mpesaName,
              mpesaNumber: fellow.mpesaNumber,
              idNumber: fellow.idNumber,
              cellNumber: fellow.cellNumber,
              county: fellow.county,
              subCounty: fellow.subCounty,
              dateOfBirth: fellow.dateOfBirth,
              gender: fellow.gender,
              hubId: createdHub.id,
            },
          });
        }

        for (const school of Object.values(hub.schools)) {
          const createdSchool = await db.school.create({
            data: {
              id: school.id,
              hubId: createdHub.id,
              implementerId: implementer.id,
              visibleId: school.visibleId,
              schoolName: school.schoolName,
              schoolType: school.schoolType,
              schoolEmail: school.schoolEmail,
              schoolCounty: school.schoolCounty,
              schoolDemographics: school.schoolDemographics,
              pointPersonId: school.pointPersonId,
              pointPersonName: school.pointPersonName,
              pointPersonPhone: school.pointPersonPhone,
              numbersExpected: school.numbersExpected,
              principalName: school.principalName,
            },
          });

          for (const student of Object.values(school.students)) {
            await db.student.create({
              data: {
                id: student.id,
                visibleId: student.visibleId,
                studentName: student.studentName,
                admissionNumber: student.admissionNumber,
                dateOfBirth: student.dateOfBirth,
                gender: student.gender,
                condition: student.condition,
                fellow: {
                  connect: {
                    visibleId: student.fellowVisibleId,
                  },
                },
                school: {
                  connect: { id: createdSchool.id },
                },
              },
            });
          }
        }
      }
    }
  }

  console.log("Development database seeding complete 🌱");
}

seedDatabase()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

async function truncateTables() {
  console.log("Truncating tables");

  const excludedTables = ["_prisma_migrations"];

  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN (${excludedTables.map((table) => `'${table}'`).join(", ")});
  `;

  if (tables.length > 0) {
    const truncateCommand = `TRUNCATE TABLE ${tables.map((t) => `"${t.table_name}"`).join(", ")} CASCADE;`;
    await db.$executeRawUnsafe(truncateCommand);
    console.log("Selected tables truncated successfully.");
  } else {
    console.log(
      "No tables to truncate. Make sure to run `npm run db:dev:migrate` first.",
    );
  }
}
