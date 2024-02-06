import { ImplementerRole } from "@prisma/client";

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

              supervisors: {
                SPV24_S_01: {
                  id: objectId("sup"),
                  visibleId: "SPV24_S_01",
                  supervisorName: "James Kariuki",
                  supervisorEmail: "james.kariuki@example.com",
                  idNumber: "200100200",
                  cellNumber: "+254700000003",
                  mpesaName: "James Kariuki",
                  mpesaNumber: "+254700000003",
                  county: "Nairobi",
                  subCounty: "Westlands",
                  dateOfBirth: new Date("1975-04-20"),
                  gender: "Male",
                },
                SPV24_S_02: {
                  id: objectId("sup"),
                  visibleId: "SPV24_S_02",
                  supervisorName: "Mary Wanjiku",
                  supervisorEmail: "mary.wanjiku@example.com",
                  idNumber: "200200300",
                  cellNumber: "+254700000004",
                  mpesaName: "Mary Wanjiku",
                  mpesaNumber: "+254700000004",
                  county: "Kiambu",
                  subCounty: "Thika",
                  dateOfBirth: new Date("1980-08-15"),
                  gender: "Female",
                },
              },

              fellows: {
                TFW24_S_01: {
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
                  supervisorVisibleId: "SPV24_S_01",
                },
                TFW24_S_02: {
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
                  supervisorVisibleId: "SPV24_S_02",
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
                  assignedSupervisorVisibleId: "SPV24_S_01",

                  students: {
                    ANS24_Stu_01: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_01",
                      studentName: "Alice Mwangi",
                      admissionNumber: "ADM123",
                      dateOfBirth: new Date("2005-05-05"),
                      gender: "Female",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_01",
                    },
                    ANS24_Stu_02: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_02",
                      studentName: "Bob Otieno",
                      admissionNumber: "ADM124",
                      dateOfBirth: new Date("2006-06-06"),
                      gender: "Male",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_01",
                    },
                    ANS24_Stu_03: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_03",
                      studentName: "Caroline Njeri",
                      admissionNumber: "ADM125",
                      dateOfBirth: new Date("2005-07-07"),
                      gender: "Female",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                    },
                    ANS24_Stu_04: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_04",
                      studentName: "David Kimani",
                      admissionNumber: "ADM126",
                      dateOfBirth: new Date("2006-08-08"),
                      gender: "Male",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                    },
                  },
                },
              },
            },
          },
        },
      },

      users: {
        edmund: {
          id: objectId("user"),
          email: "edmund@shamiri.institute",
          role: ImplementerRole.SUPERVISOR,
          roleByVisibleId: "SPV24_S_01",
        },
        benny: {
          id: objectId("user"),
          email: "benny@shamiri.institute",
          role: ImplementerRole.SUPERVISOR,
          roleByVisibleId: "SPV24_S_01",
        },
        shadrack: {
          id: objectId("user"),
          email: "shadrack.lilan@shamiri.institute",
          role: ImplementerRole.SUPERVISOR,
          roleByVisibleId: "SPV24_S_01",
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
          name: project.projectName,
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

        for (const supervisor of Object.values(hub.supervisors)) {
          await db.supervisor.create({
            data: {
              id: supervisor.id,
              visibleId: supervisor.visibleId,
              supervisorName: supervisor.supervisorName,
              supervisorEmail: supervisor.supervisorEmail,
              idNumber: supervisor.idNumber,
              cellNumber: supervisor.cellNumber,
              mpesaName: supervisor.mpesaName,
              mpesaNumber: supervisor.mpesaNumber,
              county: supervisor.county,
              subCounty: supervisor.subCounty,
              dateOfBirth: supervisor.dateOfBirth,
              gender: supervisor.gender,
              implementerId: implementer.id,
              hubId: createdHub.id,
            },
          });
        }

        for (const fellow of Object.values(hub.fellows)) {
          const createdSupervisor = await db.supervisor.findUniqueOrThrow({
            where: {
              visibleId: fellow.supervisorVisibleId,
            },
          });

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
              supervisorId: createdSupervisor.id,
            },
          });
        }

        for (const school of Object.values(hub.schools)) {
          const createdSchool = await db.school.create({
            data: {
              id: school.id,
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
              hub: {
                connect: { id: createdHub.id },
              },
              implementer: {
                connect: { id: implementer.id },
              },
              assignedSupervisor: {
                connect: { visibleId: school.assignedSupervisorVisibleId },
              },
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

    for (const user of Object.values(implementer.users)) {
      const supervisor = await db.supervisor.findUniqueOrThrow({
        where: {
          visibleId: user.roleByVisibleId,
        },
      });
      await db.user.create({
        data: {
          id: user.id,
          email: user.email,
          memberships: {
            create: {
              implementerId: implementer.id,
              role: user.role,
              identifier: supervisor.id,
            },
          },
        },
      });
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
