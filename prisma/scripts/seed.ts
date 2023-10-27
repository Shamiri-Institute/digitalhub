import { objectId } from "#/lib/crypto";
import { Database, db } from "#/lib/db";
import { parseEuropeanDate } from "#/lib/utils";
import { parseCsvFile } from "#/prisma/scripts/utils";

async function seedDatabase() {
  await truncateTables();
  await createSystemUser(db);
  await createImplementers(db);
  // await createPermissions(db);
  // await createRoles(db);
  // await createUsers(db);
  await createHubs(db);
  await createSchools(db);
  await createSupervisors(db);
  await createFellows(db);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await createFellowAttendances(db);
  await createStudents(db);
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
  await db.$executeRaw`
  TRUNCATE TABLE implementers, implementer_avatars, implementer_invites, implementer_members, files, users, accounts, sessions, verification_tokens, user_avatars, roles, member_roles, permissions, role_permissions, user_recent_opens, member_permissions, hubs, students, fellows, fellow_attendances, supervisors, schools, hub_coordinators;
  `;
}

async function createSystemUser(db: Database) {
  await db.user.create({
    data: {
      id: "system",
      email: "tech+system@shamiri.institute",
      name: "Shamiri System",
    },
  });
}

async function createImplementers(db: Database) {
  console.log("Creating implementers");

  await parseCsvFile("implementer_info", async (implementer: any) => {
    await db.implementer.create({
      data: {
        id: objectId("impl"),
        visibleId: implementer["Implementer_ID"],
        implementerName: implementer["Implementer"],
        implementerType: implementer["Implementer_Type"],
        implementerAddress: implementer["address"],
        pointPersonName: implementer["Point_Person_Name"],
        pointPersonPhone: implementer["PP_Phone"],
        pointPersonEmail: implementer["PP_Email"],
      },
    });
  });
}

// async function createPermissions(db: Database) {
//   for (let permission of fixtures.permissions) {
//     await db.permission.create({
//       data: {
//         permissionLabel: permission,
//       },
//     });
//   }
// }

// async function createRoles(db: Database) {
//   for (let roleFixture of fixtures.roles) {
//     const role = await db.role.create({
//       data: {
//         id: roleFixture.roleId,
//         name: roleFixture.roleName,
//         description: roleFixture.roleDescription,
//       },
//     });

//     for (let permissionFixture of roleFixture.permissions) {
//       const permission = await db.permission.findFirstOrThrow({
//         where: { permissionLabel: permissionFixture },
//       });

//       await db.rolePermission.create({
//         data: {
//           roleId: role.id,
//           permissionId: permission.id,
//         },
//       });
//     }
//   }
// }

// async function createUsers(db: Database) {
//   const onboard = new OnboardUserCommand(db);
//   for (let { implementerByEmail, ...user } of fixtures.users) {
//     const implementer = await db.implementer.findFirstOrThrow({
//       where: { contactEmail: implementerByEmail },
//     });

//     const response = await onboard.run({
//       email: user.email,
//       name: user.name,
//       implementerId: implementer.id,
//       inviterId: "system",
//       role: user.implementerRole,
//       avatarUrl: user.avatarUrl ?? undefined,
//     });

//     if (user.account) {
//       await db.account.create({
//         data: {
//           type: user.account.type,
//           provider: user.account.provider,
//           providerAccountId: user.account.providerAccountId,
//           userId: response.userId,
//         },
//       });
//     }
//   }
// }

async function createHubs(db: Database) {
  console.log("Creating hubs");

  await parseCsvFile("hub_info", async (hub: any) => {
    const implementer = await db.implementer.findFirstOrThrow({
      where: { visibleId: hub["implementer_id"] },
    });

    let hubCoordinatorId: string | null = null;
    if (hub["Hub_coordinator_ID"]) {
      const hubCoordinator = await db.hubCoordinator.create({
        data: {
          id: objectId("coord"),
          visibleId: hub["Hub_coordinator_ID"],
          coordinatorName: hub["Hub_coordinator_Name"],
          implementerId: implementer.id,
        },
      });
      hubCoordinatorId = hubCoordinator.id;
    }

    await db.hub.create({
      data: {
        id: objectId("hub"),
        visibleId: hub["Hub_ID"],
        hubName: hub["Hub_Name"],
        implementerId: implementer.id,
        coordinatorId: hubCoordinatorId,
      },
    });
  });
}

async function createSchools(db: Database) {
  console.log("Creating schools");

  await parseCsvFile("school_info", async (school: any) => {
    let implementerId: string | undefined;
    if (school["Implementer_ID"]) {
      const implementer = await db.implementer.findFirstOrThrow({
        where: { visibleId: school["Implementer_ID"] },
      });
      implementerId = implementer.id;
    }

    let hubId: string | undefined;
    if (school["Hub_ID"]) {
      const hub = await db.hub.findUnique({
        where: { visibleId: school["Hub_ID"] },
      });
      hubId = hub?.id;
    }

    await db.school.create({
      data: {
        id: objectId("sch"),
        schoolName: school["School_Name"],
        schoolType: school["School_Type"],
        schoolEmail: school["School_email"],
        schoolCounty: school["School_County"],
        schoolDemographics: school["School_Demographics"],
        visibleId: school["School_ID"],
        implementerId: implementerId,
        hubId: hubId,
        pointPersonName: school["Point_Person_Name"],
        pointPersonId: school["Point_Person_ID"],
        pointPersonPhone: school["Point_Person_Phone"],
        pointPersonEmail: school["Point_Person_Email"],
        numbersExpected: parseInt(school["Numbers_Expected"]),
        boardingDay: school["Boarding_day"],
        longitude: school["Longitude"] ? parseFloat(school["Longitude"]) : null,
        latitude: school["Latitude"] ? parseFloat(school["Latitude"]) : null,
        droppedOut: Boolean(school["Dropped_Out"]),
      },
    });
  });
}

async function createFellows(db: Database) {
  console.log("Creating fellows");

  await parseCsvFile("fellow_info", async (fellow: any) => {
    await db.fellow.create({
      data: {
        id: objectId("fellow"),
        visibleId: fellow["Fellow_ID"],
        fellowName: fellow["Fellow"],
        fellowEmail: fellow["Email"],
        yearOfImplementation: parseInt(fellow["Year_of_imp"]),
        mpesaName: fellow["MPESA Name"],
        mpesaNumber: fellow["MPESA_No"],
        idNumber: fellow["ID_No"],
        cellNumber: fellow["Cell_No"],
        county: fellow["County"],
        subCounty: fellow["Sub-County"],
        dateOfBirth: fellow["DOB"],
        gender: fellow["Gender"],
        droppedOut: Boolean(fellow["Drop_out"]),
        transferred: Boolean(fellow["Transfered"]),
        hubId: (
          await db.hub.findFirst({
            where: { visibleId: fellow["Hub_ID"] },
          })
        )?.id,
        implementerId: (
          await db.implementer.findFirst({
            where: { visibleId: fellow["Implementer_ID"] },
          })
        )?.id,
        // supervisorId: (await db.supervisor.findFirstOrThrow({
        //   where: { visibleId: fellow["Supervisor_ID"] },
        // })).id,
      },
    });
  });
}

async function createSupervisors(db: Database) {
  console.log("Creating supervisors");

  await parseCsvFile("supervisor_info", async (supervisor: any) => {
    await db.supervisor.create({
      data: {
        id: objectId("sup"),
        hubId: supervisor["Hub_ID"]
          ? (
              await db.hub.findUnique({
                where: { visibleId: supervisor["Hub_ID"] },
              })
            )?.id
          : null,
        visibleId: supervisor["Supervisor_ID"],
        supervisorName: supervisor["Supervisor"],
        supervisorEmail: supervisor["Email"],
        idNumber: supervisor["ID_No"],
        cellNumber: supervisor["Cell_No"],
        mpesaNumber: supervisor["MPESA_No"],
        implementerId: supervisor["Implementer_ID"]
          ? (
              await db.implementer.findUnique({
                where: { visibleId: supervisor["Implementer_ID"] },
              })
            )?.id
          : null,
        memberId: null,
        county: supervisor["County"],
        subCounty: supervisor["Sub-County"],
        bankName: supervisor["Bank_Name"],
        bankBranch: supervisor["Bank_Branch"],
        bankAccountName: null,
        bankAccountNumber: supervisor["Bank_Acc_No"],
        kra: supervisor["KRA"],
        nhif: supervisor["NHIF"],
        nssf: supervisor["NSSF"],
        dateOfBirth: supervisor["DOB"],
        gender: supervisor["Gender"],
        trainingLevel: supervisor["Training_Level"],
        droppedOut: Boolean(supervisor["Drop_out"]),
      },
    });
  });
}

async function createFellowAttendances(db: Database) {
  console.log("Creating fellow attendances");

  await parseCsvFile(
    "fellow_attendance_temp",
    async (fellowAttendance: any) => {
      try {
        const fellowId = (await db.fellow.findFirst({
          where: { visibleId: fellowAttendance["Fellow_ID"] },
        }))!.id!;
        const schoolId = (await db.school.findFirst({
          where: { visibleId: fellowAttendance["School_ID"] },
        }))!.id!;
        const supervisorId = (await db.supervisor.findFirst({
          where: { visibleId: fellowAttendance["Supervisor_ID"] },
        }))!.id!;
        await db.fellowAttendance.create({
          data: {
            visibleId: fellowAttendance["Attendance_ID"],
            fellow: {
              connect: { id: fellowId },
            },
            sessionNumber: parseInt(fellowAttendance["Session"]),
            sessionDate: parseEuropeanDate(fellowAttendance["Date"]) as Date,
            yearOfImplementation: parseInt(fellowAttendance["Year_of_imp"]),
            school: {
              connect: { id: schoolId },
            },
            supervisor: {
              connect: { id: supervisorId },
            },
            attended: Boolean(fellowAttendance["Attended"]),
            absenceReason: fellowAttendance["Absence_Reason"],
            paymentInitiated: Boolean(fellowAttendance["Payment_Initiated"]),
          },
        });
      } catch (e) {
        console.log(fellowAttendance);
        throw e;
      }
    },
  );
}

async function createStudents(db: Database) {
  console.log("Creating students");

  await parseCsvFile("student_info", async (student: any) => {
    try {
      await db.student.create({
        data: {
          id: objectId("stu"),
          studentName: student["Name"],
          visibleId: student["Shamiri_ID"],
          fellowId: student["Fellow_ID"]
            ? (
                await db.fellow.findFirst({
                  where: { visibleId: student["Fellow_ID"] },
                })
              )?.id
            : null,
          supervisorId: student["Supervisor_ID"]
            ? (
                await db.supervisor.findFirst({
                  where: { visibleId: student["Supervisor_ID"] },
                })
              )?.id
            : null,
          implementerId: (
            await db.supervisor.findFirst({
              where: { visibleId: student["Implementer_ID"] },
            })
          )?.id,
          schoolId: (
            await db.school.findFirst({
              where: { visibleId: student["School_ID"] },
            })
          )?.id,
          yearOfImplementation: parseInt(student["Year_of_imp"]),
          admissionNumber: student["Admission_Number"],
          age: parseInt(student["Age"]),
          gender: student["Gender"],
          form: parseInt(student["Form"]),
          stream: student["Stream"],
          condition: student["Condition"],
          intervention: student["intervention"],
          tribe: student["Tribe"],
          county: student["County"],
          financialStatus: student["Financial_Status"],
          home: student["Home"],
          siblings: student["Siblings"],
          religion: student["Religion"],
          group: student["Group"],
          survivingParents: student["Surviving_Parents"],
          parentsDead: student["Parents_Dead"],
          fathersEducation: student["Fathers_Education"],
          mothersEducation: student["Mothers_Education"],
          coCurricular: student["Co_Curricular"],
          sports: student["Sports"],
          createScreeningId: Boolean(student["Create_Screening_ID"]),
          phoneNumber: student["phone_number"],
          mpesaNumber: student["mpesa_number"],
          attendanceSession0: Boolean(student["Attendance_Session_0"]),
          attendanceSession1: Boolean(student["Attendance_Session_1"]),
          attendanceSession2: Boolean(student["Attendance_Session_2"]),
          attendanceSession3: Boolean(student["Attendance_Session_3"]),
          attendanceSession4: Boolean(student["Attendance_Session_4"]),
        },
      });
    } catch (e) {
      console.log(student);
      throw e;
    }
  });
}
